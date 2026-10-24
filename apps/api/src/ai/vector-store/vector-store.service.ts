import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface VectorChunkInsert {
  chunkIndex: number;
  text: string;
  embedding: number[];
}

export interface VectorSearchOptions {
  topK?: number;
  minSimilarity?: number;
}

export interface VectorSearchResult {
  chunkId: string;
  entryId: string;
  chunkIndex: number;
  text: string;
  title: string;
  createdAt: string;
  similarity: number;
}

interface RawVectorSearchRow {
  chunkId: string;
  entryId: string;
  chunkIndex: number;
  text: string;
  title: string;
  createdAt: Date | string;
  similarity: number;
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

  /**
   * Executes a tenant-isolated cosine similarity search in pgvector.
   * Security invariant: Mandatory user_id filtering is enforced inside SQL
   * on both journal_vectors and journal_entries before ranking and limiting.
   */
  async searchSimilar(
    queryEmbedding: number[],
    userId: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Authenticated userId is required for vector search');
    }

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error('Query embedding must be a non-empty vector');
    }

    for (let i = 0; i < queryEmbedding.length; i++) {
      if (
        typeof queryEmbedding[i] !== 'number' ||
        !Number.isFinite(queryEmbedding[i])
      ) {
        throw new Error(
          `Query embedding contains invalid numeric value at index ${i}`,
        );
      }
    }

    const safeTopK = Math.min(
      20,
      Math.max(1, Math.floor(options.topK ?? 5)),
    );
    const safeThreshold = Math.min(
      1,
      Math.max(0, Number(options.minSimilarity ?? 0.25)),
    );
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    try {
      const rows = await this.prisma.$queryRaw<RawVectorSearchRow[]>`
        SELECT
          jv."id" AS "chunkId",
          jv."journal_entry_id" AS "entryId",
          jv."chunk_index" AS "chunkIndex",
          jv."text" AS "text",
          je."title" AS "title",
          je."created_at" AS "createdAt",
          (1 - (jv."embedding" <=> ${vectorLiteral}::vector))::float8 AS "similarity"
        FROM "journal_vectors" jv
        INNER JOIN "journal_entries" je
          ON je."id" = jv."journal_entry_id"
          AND je."user_id" = ${userId}
        WHERE jv."user_id" = ${userId}
          AND (1 - (jv."embedding" <=> ${vectorLiteral}::vector)) >= ${safeThreshold}
        ORDER BY jv."embedding" <=> ${vectorLiteral}::vector ASC
        LIMIT ${safeTopK};
      `;

      return rows.map((row) => ({
        chunkId: row.chunkId,
        entryId: row.entryId,
        chunkIndex: Number(row.chunkIndex),
        text: row.text,
        title: row.title,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : new Date(row.createdAt).toISOString(),
        similarity: Number(row.similarity),
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[VectorStore] Similarity search failed (tenant=${userId.slice(0, 8)}...): ${message}`,
      );
      throw err;
    }
  }
}


