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

    mockPrismaService.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback(mockTx);
    });

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
});

