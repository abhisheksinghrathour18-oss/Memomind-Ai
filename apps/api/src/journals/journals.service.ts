import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JournalEntryContract, PaginatedJournalsResponse } from '@memomind/shared';
import { Prisma } from '@memomind/database';

@Injectable()
export class JournalsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToContract(entry: {
    id: string;
    title: string;
    content: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }): JournalEntryContract {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      userId: entry.userId,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  async create(userId: string, dto: CreateJournalDto): Promise<JournalEntryContract> {
    const entry = await this.prisma.journalEntry.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId, // Strictly derived from server-side authenticated session
      },
    });

    return this.mapToContract(entry);
  }

  async findAll(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedJournalsResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.JournalEntryWhereInput = {
      userId, // Strict tenant-isolation condition in SQL query
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

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    // Tenant boundary: prevent access to another tenant's resource without leaking contents
    if (entry.userId !== userId) {
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

    if (!existing) {
      throw new NotFoundException('Journal entry not found');
    }

    // Tenant boundary check
    if (existing.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });

    return this.mapToContract(updated);
  }

  async delete(userId: string, id: string): Promise<{ message: string; id: string }> {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Journal entry not found');
    }

    // Tenant boundary check
    if (existing.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    await this.prisma.journalEntry.delete({
      where: { id },
    });

    return {
      message: 'Journal entry deleted successfully',
      id,
    };
  }
}
