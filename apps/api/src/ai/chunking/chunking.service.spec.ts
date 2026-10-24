import { describe, it, expect } from 'vitest';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  const service = new ChunkingService();

  it('1. Returns a single chunk for content under chunk size', () => {
    const text = 'A short journal entry about our MVP architecture.';
    const chunks = service.chunk(text, { chunkSize: 500, overlap: 50 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].text).toBe(text);
  });

  it('2. Deterministically chunks longer content with overlap', () => {
    const paragraph1 = 'This is the first long paragraph with lots of interesting reflections on building AI systems.';
    const paragraph2 = 'This is the second long paragraph with practical engineering decisions regarding database indexes.';
    const text = `${paragraph1}\n\n${paragraph2}`;

    const chunks = service.chunk(text, { chunkSize: 100, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
  });

  it('3. Returns empty array for empty or whitespace-only text', () => {
    expect(service.chunk('')).toEqual([]);
    expect(service.chunk('   \n\t  ')).toEqual([]);
  });
});

