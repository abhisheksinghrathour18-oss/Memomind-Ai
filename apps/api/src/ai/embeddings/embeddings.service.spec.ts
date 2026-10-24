import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingsService } from './embeddings.service';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

describe('EmbeddingsService', () => {
  let embeddingsService: EmbeddingsService;
  let mockProvider: Partial<OpenAiEmbeddingProvider>;

  beforeEach(() => {
    mockProvider = {
      name: 'openai',
      dimensions: 4, // Use 4 for test brevity
      generateEmbeddings: vi.fn(),
    };

    embeddingsService = new EmbeddingsService(
      mockProvider as OpenAiEmbeddingProvider,
    );
  });

  it('1. Successfully generates embeddings when provider returns valid vector', async () => {
    const validVectors = [
      [0.1, -0.2, 0.35, 0.9],
      [0.0, 0.5, -0.1, 0.4],
    ];

    vi.mocked(mockProvider.generateEmbeddings!).mockResolvedValue(validVectors);

    const result = await embeddingsService.generateEmbeddings(['chunk 1', 'chunk 2']);
    expect(result).toEqual(validVectors);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(4);
  });

  it('2. Throws error on vector dimension mismatch', async () => {
    // Expected dimensions: 4, but provider returned vector with length 3
    const badVectors = [[0.1, 0.2, 0.3]];

    vi.mocked(mockProvider.generateEmbeddings!).mockResolvedValue(badVectors);

    await expect(
      embeddingsService.generateEmbeddings(['text']),
    ).rejects.toThrow('dimension mismatch: expected 4, got 3');
  });

  it('3. Throws error when embedding contains non-finite numbers', async () => {
    const nanVectors = [[0.1, NaN, 0.3, 0.4]];

    vi.mocked(mockProvider.generateEmbeddings!).mockResolvedValue(nanVectors);

    await expect(
      embeddingsService.generateEmbeddings(['text']),
    ).rejects.toThrow('contains invalid value');
  });

  it('4. Returns empty array without calling provider on empty input', async () => {
    const result = await embeddingsService.generateEmbeddings([]);
    expect(result).toEqual([]);
    expect(mockProvider.generateEmbeddings).not.toHaveBeenCalled();
  });
});

