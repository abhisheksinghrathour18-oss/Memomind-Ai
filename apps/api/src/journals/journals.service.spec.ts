import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JournalsService } from './journals.service';
import { PrismaService } from '../database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('JournalsService - Multi-Tenant Authorization', () => {
  let journalsService: JournalsService;
  let mockPrismaService: {
    journalEntry: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrismaService = {
      journalEntry: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    journalsService = new JournalsService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  it('6. Creates an entry explicitly bound to the authenticated userId', async () => {
    const userId = 'tenant-user-1';
    const dto = { title: 'Private Journal', content: 'Secret thoughts' };

    mockPrismaService.journalEntry.create.mockResolvedValue({
      id: 'entry-1',
      title: dto.title,
      content: dto.content,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await journalsService.create(userId, dto);
    expect(result.userId).toBe(userId);
    expect(mockPrismaService.journalEntry.create).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        content: dto.content,
        userId,
      },
    });
  });

  it('7. Scopes list queries strictly to the authenticated tenant', async () => {
    const userId = 'tenant-user-1';
    mockPrismaService.journalEntry.findMany.mockResolvedValue([
      { id: 'entry-1', title: 'T1 Entry', userId },
    ]);

    const results = await journalsService.findAll(userId);
    expect(results).toHaveLength(1);
    expect(mockPrismaService.journalEntry.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('8. Throws ForbiddenException when a user attempts to access another user resource', async () => {
    const ownerUserId = 'owner-user';
    const attackerUserId = 'attacker-user';
    const entryId = 'secret-entry-99';

    // Entry exists, but belongs to ownerUserId
    mockPrismaService.journalEntry.findUnique.mockResolvedValue({
      id: entryId,
      title: 'Confidential Journal',
      content: 'Very secret text',
      userId: ownerUserId,
    });

    // Attacker tries to read owner's entry
    await expect(
      journalsService.findOne(attackerUserId, entryId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('9. Throws NotFoundException when entry does not exist', async () => {
    mockPrismaService.journalEntry.findUnique.mockResolvedValue(null);

    await expect(
      journalsService.findOne('any-user', 'nonexistent-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('10. Allows owner to read their own entry successfully', async () => {
    const ownerId = 'legit-user';
    const entryId = 'my-entry';
    mockPrismaService.journalEntry.findUnique.mockResolvedValue({
      id: entryId,
      title: 'My Entry',
      content: 'Content',
      userId: ownerId,
    });

    const result = await journalsService.findOne(ownerId, entryId);
    expect(result.id).toBe(entryId);
    expect(result.userId).toBe(ownerId);
  });
});
