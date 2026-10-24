-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "indexing_error" TEXT,
ADD COLUMN     "indexing_status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "journal_vectors" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_vectors_user_id_idx" ON "journal_vectors"("user_id");

-- CreateIndex
CREATE INDEX "journal_vectors_journal_entry_id_idx" ON "journal_vectors"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entries_indexing_status_idx" ON "journal_entries"("indexing_status");

-- AddForeignKey
ALTER TABLE "journal_vectors" ADD CONSTRAINT "journal_vectors_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_vectors" ADD CONSTRAINT "journal_vectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "journal_vectors_embedding_cosine_idx" ON "journal_vectors" USING hnsw (embedding vector_cosine_ops);
