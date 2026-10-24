import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from './llm.service';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

describe('LlmService & Provider Abstraction', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function createLlmServiceWithEnv(env: Record<string, string | undefined>): LlmService {
    const mockConfig = {
      get: vi.fn((key: string, defaultVal?: unknown) => {
        return env[key] !== undefined ? env[key] : defaultVal;
      }),
    } as unknown as ConfigService;

    const ollamaProvider = new OllamaProvider(mockConfig);
    const openRouterProvider = new OpenRouterProvider(mockConfig);
    return new LlmService(mockConfig, ollamaProvider, openRouterProvider);
  }

  it('1. Selects OllamaProvider when LLM_PROVIDER=ollama and succeeds without an API key', async () => {
    const llmService = createLlmServiceWithEnv({
      LLM_PROVIDER: 'ollama',
      LLM_BASE_URL: 'http://localhost:11434/v1',
      LLM_MODEL: 'llama3.2',
      LLM_API_KEY: undefined,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '  Your journal says you had oatmeal on Tuesday.  ',
            },
          },
        ],
      }),
    } as Response);

    expect(llmService.providerName).toBe('ollama');
    expect(llmService.modelName).toBe('llama3.2');

    const result = await llmService.generateAnswer({
      systemPrompt: 'Answer only from context.',
      question: 'What did I eat on Tuesday?',
      context: '<untrusted_journal_context>Had oatmeal</untrusted_journal_context>',
    });

    expect(result).toEqual({
      answer: 'Your journal says you had oatmeal on Tuesday.',
      provider: 'ollama',
      model: 'llama3.2',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('2. Selects OpenRouterProvider when LLM_PROVIDER=openrouter and sends Bearer token', async () => {
    const llmService = createLlmServiceWithEnv({
      LLM_PROVIDER: 'openrouter',
      LLM_BASE_URL: 'https://openrouter.ai/api/v1',
      LLM_MODEL: 'meta-llama/llama-3.1-8b-instruct',
      LLM_API_KEY: 'sk-or-test-key',
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'You went for a 5km run in the park.',
            },
          },
        ],
      }),
    } as Response);

    expect(llmService.providerName).toBe('openrouter');
    expect(llmService.modelName).toBe('meta-llama/llama-3.1-8b-instruct');

    const result = await llmService.generateAnswer({
      systemPrompt: 'Answer only from context.',
      question: 'What exercise did I do?',
      context: '<untrusted_journal_context>Went for a 5km run in the park</untrusted_journal_context>',
    });

    expect(result).toEqual({
      answer: 'You went for a 5km run in the park.',
      provider: 'openrouter',
      model: 'meta-llama/llama-3.1-8b-instruct',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-or-test-key',
        },
      }),
    );
  });

  it('3. Throws ServiceUnavailableException when OpenRouter credentials (LLM_API_KEY) are missing', async () => {
    const llmService = createLlmServiceWithEnv({
      LLM_PROVIDER: 'openrouter',
      LLM_BASE_URL: 'https://openrouter.ai/api/v1',
      LLM_MODEL: 'openai/gpt-4o-mini',
      LLM_API_KEY: '   ',
    });

    await expect(
      llmService.generateAnswer({
        systemPrompt: 'System prompt',
        question: 'Question?',
        context: 'Context',
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('4. Throws ServiceUnavailableException when an unsupported LLM_PROVIDER is configured', async () => {
    const llmService = createLlmServiceWithEnv({
      LLM_PROVIDER: 'unsupported-provider',
    });

    await expect(
      llmService.generateAnswer({
        systemPrompt: 'System prompt',
        question: 'Question?',
        context: 'Context',
      }),
    ).rejects.toThrow('Unsupported LLM_PROVIDER');
  });
});

