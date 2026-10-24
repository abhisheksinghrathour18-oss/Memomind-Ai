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
export class OpenRouterProvider implements LlmProvider {
  readonly providerName = 'openrouter';
  private readonly logger = new Logger(OpenRouterProvider.name);

  constructor(private readonly configService: ConfigService) {}

  get modelName(): string {
    return (
      this.configService.get<string>('LLM_MODEL')?.trim() ||
      'openai/gpt-4o-mini'
    );
  }

  private resolveEndpoint(): string {
    const rawBaseUrl = (
      this.configService.get<string>('LLM_BASE_URL')?.trim() ||
      'https://openrouter.ai/api/v1'
    ).replace(/\/+$/, '');

    if (rawBaseUrl.endsWith('/chat/completions')) {
      return rawBaseUrl;
    }
    return `${rawBaseUrl}/chat/completions`;
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
    const apiKey = this.configService.get<string>('LLM_API_KEY')?.trim();

    if (!apiKey) {
      this.logger.error(
        '[OpenRouterProvider] Missing LLM_API_KEY for cloud provider OpenRouter',
      );
      throw new ServiceUnavailableException(
        'OpenRouter LLM provider requires LLM_API_KEY to be configured in the environment.',
      );
    }

    const endpoint = this.resolveEndpoint();
    const model = this.modelName;

    const payload = {
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: this.buildUserContent(params) },
      ],
      temperature: 0.1,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `[OpenRouterProvider] Chat completion failed with HTTP ${response.status} (model=${model})`,
        );
        throw new ServiceUnavailableException(
          `OpenRouter chat completion request failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as OpenAiCompatibleChatResponse;
      const content = json.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new ServiceUnavailableException(
          'OpenRouter provider returned an empty chat completion response',
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
        `[OpenRouterProvider] Request error (model=${model}): ${reason}`,
      );
      throw new ServiceUnavailableException(
        `Failed to communicate with OpenRouter provider: ${reason}`,
      );
    }
  }
}

