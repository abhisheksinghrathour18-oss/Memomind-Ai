import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface VectorChunkInsert {
  chunkIndex: number;
  text: string;
  embedding: number[];
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replaces existing vectors for an entry with new chunks atomically.
   * Multi-tenant safety: always enforces user_id check in query.
   */
  async upsertVectors(
    entryId: string,
    userId: string,
    chunks: VectorChunkInsert[],
  ): Promise<void> {
    if (!chunks.length) {
      await this.deleteVectors(entryId, userId);
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete any existing stale vectors for this entry & tenant
        await tx.$executeRaw`
          DELETE FROM "journal_vectors"
          WHERE "journal_entry_id" = ${entryId}
            AND "user_id" = ${userId};
        `;

        // 2. Insert new chunk vectors using parameterized SQL
        for (const chunk of chunks) {
          const vectorLiteral = `[${chunk.embedding.join(',')}]`;
          await tx.$executeRaw`
            INSERT INTO "journal_vectors" (
              "id",
              "journal_entry_id",
              "user_id",
              "chunk_index",
              "text",
              "embedding",
              "created_at",
              "updated_at"
            ) VALUES (
              gen_random_uuid(),
              ${entryId},
              ${userId},
              ${chunk.chunkIndex},
              ${chunk.text},
              ${vectorLiteral}::vector,
              NOW(),
              NOW()
            );
          `;
        }
      });

      this.logger.log(
        `[VectorStore] Successfully upserted ${chunks.length} vector(s) for entry ${entryId} (tenant: ${userId.slice(0, 8)}...)`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[VectorStore] Failed to upsert vectors for entry ${entryId}: ${message}`,
      );
      throw err;
    }
  }

  /**
   * Deletes all vector records for a journal entry belonging to the authenticated tenant.
   */
  async deleteVectors(entryId: string, userId: string): Promise<number> {
    try {
      const deletedCount = await this.prisma.$executeRaw`
        DELETE FROM "journal_vectors"
        WHERE "journal_entry_id" = ${entryId}
          AND "user_id" = ${userId};
      `;

      this.logger.log(
        `[VectorStore] Deleted vectors for entry ${entryId} (tenant: ${userId.slice(0, 8)}...)`,
      );
      return deletedCount;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[VectorStore] Failed to delete vectors for entry ${entryId}: ${message}`,
      );
      throw err;
    }
  }

  /**
   * Counts vectors stored for a given entry.
   */
  async countVectors(entryId: string, userId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*)::int as count
      FROM "journal_vectors"
      WHERE "journal_entry_id" = ${entryId}
        AND "user_id" = ${userId};
    `;

    return Number(result[0]?.count ?? 0);
  }
}

