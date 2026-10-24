import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ragApi } from './rag-api';

describe('ragApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends authenticated POST request to /rag/ask with credentials included', async () => {
    const mockResponse = {
      answer: 'Your journal says you had oatmeal for breakfast.',
      sources: [
        {
          entryId: 'entry-1',
          title: 'Tuesday morning',
          createdAt: '2026-10-20T08:00:00.000Z',
          excerpt: 'I had oatmeal for breakfast...',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await ragApi.ask('  What did I eat for breakfast on Tuesday?  ');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rag/ask'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What did I eat for breakfast on Tuesday?',
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it('throws descriptive AuthError when backend returns non-OK status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        message: 'LLM provider is currently unavailable',
      }),
    } as Response);

    await expect(ragApi.ask('What did I eat?')).rejects.toThrow(
      'LLM provider is currently unavailable',
    );
  });
});

