import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from '../ai/embeddings/embeddings.service';
import {
  VectorSearchResult,
  VectorStoreService,
} from '../ai/vector-store/vector-store.service';

export interface RetrievalOutcome {
  chunks: VectorSearchResult[];
  retrievalDurationMs: number;
  topK: number;
  minSimilarity: number;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly configService: ConfigService,
  ) {}

  get topK(): number {
    const configured = Number(this.configService.get<number>('RAG_TOP_K', 5));
    if (!Number.isFinite(configured)) return 5;
    return Math.min(20, Math.max(1, Math.floor(configured)));
  }

  get minSimilarity(): number {
    const configured = Number(
      this.configService.get<number>('RAG_SIMILARITY_THRESHOLD', 0.25),
    );
    if (!Number.isFinite(configured)) return 0.25;
    return Math.min(1, Math.max(0, configured));
  }

  async retrieve(userId: string, question: string): Promise<RetrievalOutcome> {
    if (!userId || !userId.trim()) {
      throw new BadRequestException(
        'Authenticated user context is required for semantic retrieval',
      );
    }

    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      throw new BadRequestException('Question must not be empty');
    }

    const startTime = Date.now();
    const topK = this.topK;
    const minSimilarity = this.minSimilarity;

    // 1. Generate query embedding using configured embedding provider
    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(normalizedQuestion);

    // 2. Search vector database with mandatory authenticated user_id filter
    const rawResults = await this.vectorStoreService.searchSimilar(
      queryEmbedding,
      userId,
      {
        topK,
        minSimilarity,
      },
    );

    // 3. Rank by descending similarity and enforce threshold & top-k limit
    const chunks = rawResults
      .filter((chunk) => chunk.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    const retrievalDurationMs = Date.now() - startTime;

    this.logger.log(
      `[Retrieval] event=rag_retrieval_complete tenant=${userId.slice(0, 8)}... retrievedChunks=${chunks.length} topK=${topK} minSimilarity=${minSimilarity} durationMs=${retrievalDurationMs}`,
    );

    return {
      chunks,
      retrievalDurationMs,
      topK,
      minSimilarity,
    };
  }
}

