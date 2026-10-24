import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JournalsService } from './journals.service';
import { PrismaService } from '../database/prisma.service';
import { EmbeddingsService } from '../ai/embeddings/embeddings.service';
import { ChunkingService } from '../ai/chunking/chunking.service';
import { VectorStoreService } from '../ai/vector-store/vector-store.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('JournalsService - Milestone 3 Vector Indexing Lifecycle', () => {
  let journalsService: JournalsService;
  let mockPrismaService: {
    journalEntry: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEmbeddingsService: Partial<EmbeddingsService>;
  let mockChunkingService: Partial<ChunkingService>;
  let mockVectorStoreService: Partial<VectorStoreService>;

  const userA = 'user-tenant-a';
  const userB = 'user-tenant-b';

  beforeEach(() => {
    mockPrismaService = {
      journalEntry: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockEmbeddingsService = {
      generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    };

    mockChunkingService = {
      chunk: vi.fn().mockReturnValue([{ chunkIndex: 0, text: 'Sample chunk' }]),
    };

    mockVectorStoreService = {
      upsertVectors: vi.fn().mockResolvedValue(undefined),
      deleteVectors: vi.fn().mockResolvedValue(1),
      countVectors: vi.fn().mockResolvedValue(1),
    };

    journalsService = new JournalsService(
      mockPrismaService as unknown as PrismaService,
      mockEmbeddingsService as EmbeddingsService,
      mockChunkingService as ChunkingService,
      mockVectorStoreService as VectorStoreService,
    );
  });

  describe('Create with Vector Indexing', () => {
    it('1. Successfully creates entry, generates embeddings, stores vector, and sets INDEXED', async () => {
      const now = new Date('2026-10-24T00:00:00.000Z');
      mockPrismaService.journalEntry.create.mockResolvedValue({
        id: 'entry-1',
        title: 'Entry One',
        content: 'Content to be indexed',
        userId: userA,
        indexingStatus: 'PENDING',
        indexingError: null,
        createdAt: now,
        updatedAt: now,
      });

      mockPrismaService.journalEntry.update.mockResolvedValue({
        id: 'entry-1',
        title: 'Entry One',
        content: 'Content to be indexed',
        userId: userA,
        indexingStatus: 'INDEXED',
        indexingError: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.create(userA, {
        title: 'Entry One',
        content: 'Content to be indexed',
      });

      expect(result.id).toBe('entry-1');
      expect(result.indexingStatus).toBe('INDEXED');
      expect(mockChunkingService.chunk).toHaveBeenCalledWith('Content to be indexed');
      expect(mockEmbeddingsService.generateEmbeddings).toHaveBeenCalledWith(['Sample chunk']);
      expect(mockVectorStoreService.upsertVectors).toHaveBeenCalledWith(
        'entry-1',
        userA,
        [{ chunkIndex: 0, text: 'Sample chunk', embedding: [0.1, 0.2, 0.3] }],
      );
    });

    it('2. Embedding failure preserves journal entry and marks indexingStatus as FAILED', async () => {
      const now = new Date('2026-10-24T00:00:00.000Z');
      mockPrismaService.journalEntry.create.mockResolvedValue({
        id: 'entry-fail',
        title: 'Entry Fail',
        content: 'Content',
        userId: userA,
        indexingStatus: 'PENDING',
        indexingError: null,
        createdAt: now,
        updatedAt: now,
      });

      vi.mocked(mockEmbeddingsService.generateEmbeddings!).mockRejectedValue(
        new Error('API quota exceeded'),
      );

      mockPrismaService.journalEntry.update.mockResolvedValue({
        id: 'entry-fail',
        title: 'Entry Fail',
        content: 'Content',
        userId: userA,
        indexingStatus: 'FAILED',
        indexingError: 'API quota exceeded',
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.create(userA, {
        title: 'Entry Fail',
        content: 'Content',
      });

      // Entry is preserved, but status is FAILED
      expect(result.id).toBe('entry-fail');
      expect(result.indexingStatus).toBe('FAILED');
      expect(result.indexingError).toContain('API quota exceeded');
      expect(mockPrismaService.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ indexingStatus: 'FAILED' }),
        }),
      );
    });

    it('3. Vector store failure marks status as FAILED without false positive', async () => {
      const now = new Date();
      mockPrismaService.journalEntry.create.mockResolvedValue({
        id: 'entry-db-fail',
        title: 'DB Fail',
        content: 'Content',
        userId: userA,
        indexingStatus: 'PENDING',
        indexingError: null,
        createdAt: now,
        updatedAt: now,
      });

      vi.mocked(mockVectorStoreService.upsertVectors!).mockRejectedValue(
        new Error('Database timeout'),
      );

      const result = await journalsService.create(userA, {
        title: 'DB Fail',
        content: 'Content',
      });

      expect(result.indexingStatus).toBe('FAILED');
      expect(result.indexingError).toContain('Database timeout');
    });
  });

  describe('Update & Vector Invalidation', () => {
    it('4. Updating content triggers re-indexing and replaces old vectors', async () => {
      const now = new Date();
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        title: 'Old Title',
        content: 'Old Content',
        userId: userA,
      });

      mockPrismaService.journalEntry.update.mockResolvedValue({
        id: 'entry-1',
        title: 'Old Title',
        content: 'Brand New Content',
        userId: userA,
        indexingStatus: 'INDEXED',
        indexingError: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.update(userA, 'entry-1', {
        content: 'Brand New Content',
      });

      expect(result.indexingStatus).toBe('INDEXED');
      expect(mockChunkingService.chunk).toHaveBeenCalledWith('Brand New Content');
      expect(mockVectorStoreService.upsertVectors).toHaveBeenCalled();
    });

    it('5. Updating only title does not re-index vectors', async () => {
      const now = new Date();
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        title: 'Old Title',
        content: 'Unchanged Content',
        userId: userA,
      });

      mockPrismaService.journalEntry.update.mockResolvedValue({
        id: 'entry-1',
        title: 'New Title',
        content: 'Unchanged Content',
        userId: userA,
        indexingStatus: 'INDEXED',
        indexingError: null,
        createdAt: now,
        updatedAt: now,
      });

      await journalsService.update(userA, 'entry-1', { title: 'New Title' });

      // Embeddings and chunking should NOT be called for title-only update
      expect(mockChunkingService.chunk).not.toHaveBeenCalled();
      expect(mockEmbeddingsService.generateEmbeddings).not.toHaveBeenCalled();
    });
  });

  describe('Delete', () => {
    it('6. Deletes associated vectors before deleting relational row', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-to-del',
        userId: userA,
      });
      mockPrismaService.journalEntry.delete.mockResolvedValue({ id: 'entry-to-del' });

      await journalsService.delete(userA, 'entry-to-del');

      expect(mockVectorStoreService.deleteVectors).toHaveBeenCalledWith('entry-to-del', userA);
      expect(mockPrismaService.journalEntry.delete).toHaveBeenCalledWith({
        where: { id: 'entry-to-del' },
      });
    });

    it('7. Rejects cross-user delete attempts', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-b',
        userId: userB,
      });

      await expect(
        journalsService.delete(userA, 'entry-b'),
      ).rejects.toThrow(NotFoundException);
      expect(mockVectorStoreService.deleteVectors).not.toHaveBeenCalled();
    });
  });

  describe('Reindexing & Multi-Tenancy', () => {
    it('8. Reindex endpoint replaces old chunk set for owned entry', async () => {
      const now = new Date();
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        title: 'Title',
        content: 'Recoverable content',
        userId: userA,
        indexingStatus: 'FAILED',
        indexingError: 'Past error',
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.reindex(userA, 'entry-1');

      expect(result.indexingStatus).toBe('INDEXED');
      expect(mockVectorStoreService.upsertVectors).toHaveBeenCalled();
    });

    it('9. Rejects cross-user reindex attempts', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-b',
        userId: userB,
      });

      await expect(
        journalsService.reindex(userA, 'entry-b'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
