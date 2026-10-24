import { Module } from '@nestjs/common';
import { OpenAiEmbeddingProvider } from './embeddings/openai-embedding.provider';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { ChunkingService } from './chunking/chunking.service';
import { VectorStoreService } from './vector-store/vector-store.service';

@Module({
  providers: [
    OpenAiEmbeddingProvider,
    EmbeddingsService,
    ChunkingService,
    VectorStoreService,
  ],
  exports: [EmbeddingsService, ChunkingService, VectorStoreService],
})
export class AiModule {}

