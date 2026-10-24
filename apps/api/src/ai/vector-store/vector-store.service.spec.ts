import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorStoreService } from './vector-store.service';
import { PrismaService } from '../../database/prisma.service';

describe('VectorStoreService', () => {
  let vectorStoreService: VectorStoreService;
  let mockPrismaService: {
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrismaService = {
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    };

    vectorStoreService = new VectorStoreService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  it('1. Successfully executes upsert inside transaction replacing old vectors', async () => {
    const mockTx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
    };

    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback(mockTx);
      },
    );

    const chunks = [
      { chunkIndex: 0, text: 'Hello', embedding: [0.1, 0.2] },
      { chunkIndex: 1, text: 'World', embedding: [0.3, 0.4] },
    ];

    await vectorStoreService.upsertVectors('entry-1', 'user-1', chunks);

    expect(mockPrismaService.$transaction).toHaveBeenCalled();
    // 1 delete + 2 inserts = 3 execute calls in transaction
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('2. Deletes vectors explicitly filtered by authenticated user_id', async () => {
    mockPrismaService.$executeRaw.mockResolvedValue(2);

    const deleted = await vectorStoreService.deleteVectors('entry-1', 'user-1');
    expect(deleted).toBe(2);
    expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
  });

  it('3. Counts vectors stored for entry', async () => {
    mockPrismaService.$queryRaw.mockResolvedValue([{ count: 3 }]);

    const count = await vectorStoreService.countVectors('entry-1', 'user-1');
    expect(count).toBe(3);
  });

  it('4. Performs semantic search scoped by authenticated user_id in parameterized SQL', async () => {
    mockPrismaService.$queryRaw.mockResolvedValue([
      {
        chunkId: 'chunk-1',
        entryId: 'entry-1',
        chunkIndex: 0,
        text: 'I had oatmeal with blueberries for breakfast on Tuesday.',
        title: 'Tuesday morning',
        createdAt: new Date('2026-10-20T08:00:00.000Z'),
        similarity: 0.89,
      },
    ]);

    const results = await vectorStoreService.searchSimilar(
      [0.1, 0.2, 0.3],
      'user-auth-123',
      { topK: 4, minSimilarity: 0.3 },
    );

    expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    const callArgs = mockPrismaService.$queryRaw.mock.calls[0];
    const sqlStrings = (callArgs[0] as TemplateStringsArray).join(' ');

    // Verify SQL query applies mandatory user_id filter on both tables before ranking
    expect(sqlStrings).toContain('WHERE jv."user_id" =');
    expect(sqlStrings).toContain('AND je."user_id" =');
    expect(sqlStrings).toContain('ORDER BY jv."embedding" <=>');
    expect(sqlStrings).toContain('LIMIT');

    // Verify bound parameters include authenticated userId, threshold, and limit
    expect(callArgs).toContain('user-auth-123');
    expect(callArgs).toContain(0.3);
    expect(callArgs).toContain(4);

    expect(results).toEqual([
      {
        chunkId: 'chunk-1',
        entryId: 'entry-1',
        chunkIndex: 0,
        text: 'I had oatmeal with blueberries for breakfast on Tuesday.',
        title: 'Tuesday morning',
        createdAt: '2026-10-20T08:00:00.000Z',
        similarity: 0.89,
      },
    ]);
  });

  it('5. Rejects semantic search when userId or queryEmbedding is missing or invalid', async () => {
    await expect(
      vectorStoreService.searchSimilar([0.1, 0.2], ''),
    ).rejects.toThrow('Authenticated userId is required');

    await expect(
      vectorStoreService.searchSimilar([], 'user-1'),
    ).rejects.toThrow('Query embedding must be a non-empty vector');

    await expect(
      vectorStoreService.searchSimilar([0.1, Number.NaN], 'user-1'),
    ).rejects.toThrow('invalid numeric value');
  });
});
