import { Injectable, Logger } from '@nestjs/common';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(private readonly provider: OpenAiEmbeddingProvider) {}

  get dimensions(): number {
    return this.provider.dimensions;
  }

  get providerName(): string {
    return this.provider.name;
  }

  private validateVector(vector: number[]): void {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Embedding vector must be a non-empty array');
    }

    if (vector.length !== this.dimensions) {
      throw new Error(
        `Embedding vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`,
      );
    }

    for (let i = 0; i < vector.length; i++) {
      if (typeof vector[i] !== 'number' || !Number.isFinite(vector[i])) {
        throw new Error(
          `Embedding vector contains invalid value at index ${i}: ${vector[i]}`,
        );
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const vectors = await this.generateEmbeddings([text]);
    return vectors[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) {
      return [];
    }

    const startTime = Date.now();
    this.logger.log(
      `[Embeddings] Generating embeddings for ${texts.length} chunk(s) (provider: ${this.provider.name}, dimensions: ${this.dimensions})`,
    );

    const vectors = await this.provider.generateEmbeddings(texts);

    if (vectors.length !== texts.length) {
      throw new Error(
        `Generated vector count (${vectors.length}) does not match input chunk count (${texts.length})`,
      );
    }

    for (const vector of vectors) {
      this.validateVector(vector);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `[Embeddings] Successfully generated ${vectors.length} vector(s) in ${elapsed}ms`,
    );

    return vectors;
  }
}

