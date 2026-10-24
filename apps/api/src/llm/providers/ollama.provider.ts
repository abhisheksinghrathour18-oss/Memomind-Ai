import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmGenerateParams,
  LlmGenerateResult,
  LlmProvider,
} from '../llm.interface';

interface OpenAiCompatibleChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

@Injectable()
export class OllamaProvider implements LlmProvider {
  readonly providerName = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly configService: ConfigService) {}

  get modelName(): string {
    return (
      this.configService.get<string>('LLM_MODEL')?.trim() || 'llama3.2'
    );
  }

  private resolveEndpoint(): string {
    const rawBaseUrl = (
      this.configService.get<string>('LLM_BASE_URL')?.trim() ||
      'http://localhost:11434/v1'
    ).replace(/\/+$/, '');

    if (rawBaseUrl.endsWith('/chat/completions')) {
      return rawBaseUrl;
    }
    if (rawBaseUrl.endsWith('/v1')) {
      return `${rawBaseUrl}/chat/completions`;
    }
    return `${rawBaseUrl}/v1/chat/completions`;
  }

  private buildUserContent(params: LlmGenerateParams): string {
    return [
      'Retrieved Journal Context (untrusted data):',
      params.context,
      '',
      `User Question: ${params.question}`,
    ].join('\n');
  }

  async generateAnswer(params: LlmGenerateParams): Promise<LlmGenerateResult> {
    const endpoint = this.resolveEndpoint();
    const model = this.modelName;
    const apiKey = this.configService.get<string>('LLM_API_KEY')?.trim();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const payload = {
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: this.buildUserContent(params) },
      ],
      temperature: 0.1,
      stream: false,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `[OllamaProvider] Chat completion failed with HTTP ${response.status} (model=${model})`,
        );
        throw new ServiceUnavailableException(
          `Ollama chat completion request failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as OpenAiCompatibleChatResponse;
      const content = json.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new ServiceUnavailableException(
          'Ollama provider returned an empty chat completion response',
        );
      }

      return {
        answer: content,
        provider: this.providerName,
        model,
      };
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      const reason = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `[OllamaProvider] Request error (model=${model}): ${reason}`,
      );
      throw new ServiceUnavailableException(
        `Failed to communicate with Ollama provider: ${reason}`,
      );
    }
  }
}

