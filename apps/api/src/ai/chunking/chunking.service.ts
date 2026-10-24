import { Injectable } from '@nestjs/common';

export interface TextChunk {
  chunkIndex: number;
  text: string;
}

@Injectable()
export class ChunkingService {
  private readonly defaultChunkSize = 1000;
  private readonly defaultOverlap = 150;

  chunk(
    text: string,
    options?: { chunkSize?: number; overlap?: number },
  ): TextChunk[] {
    const trimmed = text.trim();
    if (!trimmed) {
      return [];
    }

    const chunkSize = options?.chunkSize ?? this.defaultChunkSize;
    const overlap = options?.overlap ?? this.defaultOverlap;

    // Single chunk optimization for short entries
    if (trimmed.length <= chunkSize) {
      return [{ chunkIndex: 0, text: trimmed }];
    }

    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < trimmed.length) {
      let end = start + chunkSize;

      if (end >= trimmed.length) {
        chunks.push({
          chunkIndex: chunkIndex++,
          text: trimmed.slice(start).trim(),
        });
        break;
      }

      // Find natural boundary (paragraph or sentence) within last 20% of chunk
      const searchWindowStart = Math.max(start + Math.floor(chunkSize * 0.8), start);
      const segment = trimmed.slice(searchWindowStart, end);

      let splitOffset = -1;
      const paragraphIdx = segment.lastIndexOf('\n\n');
      if (paragraphIdx !== -1) {
        splitOffset = searchWindowStart + paragraphIdx + 2;
      } else {
        const lineIdx = segment.lastIndexOf('\n');
        if (lineIdx !== -1) {
          splitOffset = searchWindowStart + lineIdx + 1;
        } else {
          const sentenceIdx = Math.max(
            segment.lastIndexOf('. '),
            segment.lastIndexOf('? '),
            segment.lastIndexOf('! '),
          );
          if (sentenceIdx !== -1) {
            splitOffset = searchWindowStart + sentenceIdx + 2;
          }
        }
      }

      const finalEnd = splitOffset > start ? splitOffset : end;
      const chunkText = trimmed.slice(start, finalEnd).trim();

      if (chunkText) {
        chunks.push({
          chunkIndex: chunkIndex++,
          text: chunkText,
        });
      }

      start = finalEnd - overlap;
      if (start <= chunks[chunks.length - 1]?.text.length && finalEnd === trimmed.length) {
        break;
      }
    }

    return chunks;
  }
}

