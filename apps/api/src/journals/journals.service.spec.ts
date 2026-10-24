import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JournalsService } from './journals.service';
import { PrismaService } from '../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('JournalsService - Milestone 2 CRUD & Multi-Tenant Enforcement', () => {
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

    journalsService = new JournalsService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  describe('Create', () => {
    it('1. Successfully creates an entry bound strictly to the authenticated userId', async () => {
      const dto = { title: 'Day One', content: 'Exciting start' };
      const now = new Date('2026-10-24T00:00:00.000Z');

      mockPrismaService.journalEntry.create.mockResolvedValue({
        id: 'entry-1',
        title: dto.title,
        content: dto.content,
        userId: userA,
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.create(userA, dto);

      expect(result.id).toBe('entry-1');
      expect(result.userId).toBe(userA);
      expect(result.title).toBe(dto.title);
      expect(mockPrismaService.journalEntry.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          content: dto.content,
          userId: userA,
        },
      });
    });

    it('2. Client cannot override userId as service derives it directly from token identity', async () => {
      const dto = { title: 'Attacker Attempt', content: 'Spoofing' };
      const now = new Date();

      mockPrismaService.journalEntry.create.mockResolvedValue({
        id: 'entry-spoof',
        title: dto.title,
        content: dto.content,
        userId: userA, // Guaranteed to be authenticated user
        createdAt: now,
        updatedAt: now,
      });

      await journalsService.create(userA, dto);
      expect(mockPrismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: userA }),
        }),
      );
    });
  });

  describe('FindAll (List & Pagination)', () => {
    it('3. Lists only entries belonging to authenticated user with pagination', async () => {
      const now = new Date('2026-10-24T00:00:00.000Z');
      const mockItems = [
        {
          id: 'entry-1',
          title: 'Entry 1',
          content: 'Content 1',
          userId: userA,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([mockItems, 1]);

      const result = await journalsService.findAll(userA, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].userId).toBe(userA);
    });

    it('4. Filters by search query scoped to authenticated tenant', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await journalsService.findAll(userA, { page: 1, limit: 10, search: 'work' });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      const whereArg = mockPrismaService.journalEntry.findMany.mock.calls[0][0].where;
      expect(whereArg.userId).toBe(userA);
      expect(whereArg.OR).toBeDefined();
    });
  });

  describe('FindOne (Read)', () => {
    it('5. Successfully reads an owned entry', async () => {
      const now = new Date('2026-10-24T00:00:00.000Z');
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-owned',
        title: 'Private Journal',
        content: 'Thoughts',
        userId: userA,
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.findOne(userA, 'entry-owned');
      expect(result.id).toBe('entry-owned');
      expect(result.userId).toBe(userA);
    });

    it('6. Throws NotFoundException when another user attempts to read an entry (no data leak)', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-user-b',
        title: 'User B Secrets',
        content: 'Confidential',
        userId: userB,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // User A attempts to read User B's entry
      await expect(
        journalsService.findOne(userA, 'entry-user-b'),
      ).rejects.toThrow(NotFoundException);
    });

    it('7. Throws NotFoundException when entry does not exist', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue(null);

      await expect(
        journalsService.findOne(userA, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Update', () => {
    it('8. Successfully updates an owned entry', async () => {
      const now = new Date('2026-10-24T00:00:00.000Z');
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        title: 'Old Title',
        content: 'Old Content',
        userId: userA,
        createdAt: now,
        updatedAt: now,
      });

      mockPrismaService.journalEntry.update.mockResolvedValue({
        id: 'entry-1',
        title: 'Updated Title',
        content: 'Old Content',
        userId: userA,
        createdAt: now,
        updatedAt: now,
      });

      const result = await journalsService.update(userA, 'entry-1', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(mockPrismaService.journalEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { title: 'Updated Title' },
      });
    });

    it('9. Throws NotFoundException when attempting cross-user update', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-b',
        title: 'User B Title',
        content: 'User B Content',
        userId: userB,
      });

      await expect(
        journalsService.update(userA, 'entry-b', { title: 'Hacked Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('10. Throws BadRequestException when neither title nor content is provided', async () => {
      await expect(
        journalsService.update(userA, 'entry-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Delete', () => {
    it('11. Successfully deletes an owned entry', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-to-del',
        userId: userA,
      });
      mockPrismaService.journalEntry.delete.mockResolvedValue({ id: 'entry-to-del' });

      const result = await journalsService.delete(userA, 'entry-to-del');
      expect(result.id).toBe('entry-to-del');
      expect(mockPrismaService.journalEntry.delete).toHaveBeenCalledWith({
        where: { id: 'entry-to-del' },
      });
    });

    it('12. Throws NotFoundException when attempting cross-user delete', async () => {
      mockPrismaService.journalEntry.findUnique.mockResolvedValue({
        id: 'entry-user-b',
        userId: userB,
      });

      await expect(
        journalsService.delete(userA, 'entry-user-b'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
