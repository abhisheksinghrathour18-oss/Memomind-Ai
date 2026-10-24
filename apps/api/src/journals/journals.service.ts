import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  IndexingStatus,
  JournalEntryContract,
  PaginatedJournalsResponse,
} from '@memomind/shared';
import { Prisma } from '@memomind/database';
import { EmbeddingsService } from '../ai/embeddings/embeddings.service';
import { ChunkingService } from '../ai/chunking/chunking.service';
import { VectorStoreService } from '../ai/vector-store/vector-store.service';

@Injectable()
export class JournalsService {
  private readonly logger = new Logger(JournalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly chunkingService: ChunkingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  private mapToContract(entry: {
    id: string;
    title: string;
    content: string;
    userId: string;
    indexingStatus: string;
    indexingError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): JournalEntryContract {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      userId: entry.userId,
      indexingStatus: entry.indexingStatus as IndexingStatus,
      indexingError: entry.indexingError,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  /**
   * Internal pipeline: Chunks text, generates real embeddings, and indexes in pgvector.
   * Handles partial failure gracefully without dropping the relational entry.
   */
  private async indexEntryContent(
    entryId: string,
    userId: string,
    content: string,
  ): Promise<{ status: IndexingStatus; error?: string }> {
    try {
      const chunks = this.chunkingService.chunk(content);
      if (!chunks.length) {
        await this.vectorStoreService.deleteVectors(entryId, userId);
        return { status: 'INDEXED' };
      }

      const embeddings = await this.embeddingsService.generateEmbeddings(
        chunks.map((c) => c.text),
      );

      const vectorInserts = chunks.map((chunk, idx) => ({
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: embeddings[idx],
      }));

      await this.vectorStoreService.upsertVectors(entryId, userId, vectorInserts);

      await this.prisma.journalEntry.update({
        where: { id: entryId },
        data: {
          indexingStatus: 'INDEXED',
          indexingError: null,
        },
      });

      return { status: 'INDEXED' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[IndexingPipeline] Indexing failed for entry ${entryId}: ${errorMsg}`,
      );

      await this.prisma.journalEntry.update({
        where: { id: entryId },
        data: {
          indexingStatus: 'FAILED',
          indexingError: errorMsg,
        },
      });

      return { status: 'FAILED', error: errorMsg };
    }
  }

  async create(userId: string, dto: CreateJournalDto): Promise<JournalEntryContract> {
    // 1. Create relational entry first (ensures user data is never lost)
    const entry = await this.prisma.journalEntry.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId,
        indexingStatus: 'PENDING',
      },
    });

    // 2. Execute vector indexing pipeline
    const indexResult = await this.indexEntryContent(entry.id, userId, entry.content);

    return this.mapToContract({
      ...entry,
      indexingStatus: indexResult.status,
      indexingError: indexResult.error ?? null,
    });
  }

  async findAll(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedJournalsResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.JournalEntryWhereInput = {
      userId,
    };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      whereClause.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({
        where: whereClause,
      }),
    ]);

    return {
      items: items.map((item) => this.mapToContract(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(userId: string, id: string): Promise<JournalEntryContract> {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!entry || entry.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    return this.mapToContract(entry);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateJournalDto,
  ): Promise<JournalEntryContract> {
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException(
        'At least one field (title or content) must be provided for update',
      );
    }

    const existing = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });

    // If content changed, re-index to replace stale vectors
    if (dto.content !== undefined && dto.content !== existing.content) {
      const indexResult = await this.indexEntryContent(id, userId, dto.content);
      return this.mapToContract({
        ...updated,
        indexingStatus: indexResult.status,
        indexingError: indexResult.error ?? null,
      });
    }

    return this.mapToContract(updated);
  }

  async delete(userId: string, id: string): Promise<{ message: string; id: string }> {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    // 1. Delete associated vectors first (tenant-scoped)
    await this.vectorStoreService.deleteVectors(id, userId);

    // 2. Delete relational entry
    await this.prisma.journalEntry.delete({
      where: { id },
    });

    return {
      message: 'Journal entry deleted successfully',
      id,
    };
  }

  async reindex(userId: string, id: string): Promise<JournalEntryContract> {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    const indexResult = await this.indexEntryContent(id, userId, existing.content);

    return this.mapToContract({
      ...existing,
      indexingStatus: indexResult.status,
      indexingError: indexResult.error ?? null,
    });
  }
}
