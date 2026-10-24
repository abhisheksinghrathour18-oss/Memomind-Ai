import { describe, it, expect } from 'vitest';
import { ragAskQuestionSchema, ragAskResponseSchema } from './rag.schema';

describe('RAG Schemas', () => {
  it('validates and trims a valid question', () => {
    const result = ragAskQuestionSchema.safeParse({
      question: '  What did I eat for breakfast on Tuesday?  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What did I eat for breakfast on Tuesday?');
    }
  });

  it('rejects an empty or whitespace-only question', () => {
    const result = ragAskQuestionSchema.safeParse({ question: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a question exceeding 1000 characters', () => {
    const result = ragAskQuestionSchema.safeParse({
      question: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('validates a complete RAG response with citations', () => {
    const result = ragAskResponseSchema.safeParse({
      answer: 'Your journal says you had oatmeal for breakfast.',
      sources: [
        {
          entryId: 'entry-1',
          title: 'Tuesday morning',
          createdAt: '2026-10-20T08:30:00.000Z',
          excerpt: 'I had oatmeal for breakfast...',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

