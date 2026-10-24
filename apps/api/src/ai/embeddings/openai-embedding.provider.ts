import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider } from './embedding-provider.interface';

@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions: number;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('EMBEDDING_API_KEY');
    this.baseUrl = this.configService
      .get<string>('EMBEDDING_BASE_URL', 'https://api.openai.com/v1')
      .replace(/\/+$/, '');
    this.model = this.configService.get<string>(
      'EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
    this.dimensions = this.configService.get<number>(
      'EMBEDDING_DIMENSIONS',
      1536,
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const results = await this.generateEmbeddings([text]);
    return results[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new ServiceUnavailableException(
        'Embedding provider is not configured. Please configure EMBEDDING_API_KEY in the environment.',
      );
    }

    if (!texts.length) {
      return [];
    }

    const endpoint = `${this.baseUrl}/embeddings`;
    const payload = {
      input: texts,
      model: this.model,
      dimensions: this.dimensions,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `Embedding API returned HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
        );
        throw new Error(
          `Embedding API request failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as {
        data?: Array<{ embedding: number[]; index: number }>;
      };

      if (!json.data || !Array.isArray(json.data) || json.data.length !== texts.length) {
        throw new Error(
          `Embedding API returned unexpected format or count mismatch (expected ${texts.length}, got ${json.data?.length ?? 0})`,
        );
      }

      // Preserve input sequence by sorting on index
      return json.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to generate embeddings: ${message}`);
      throw err;
    }
  }
}

