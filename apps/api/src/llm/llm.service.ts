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
} from './llm.interface';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

@Injectable()
export class LlmService implements LlmProvider {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly openRouterProvider: OpenRouterProvider,
  ) {}

  private resolveProvider(): LlmProvider {
    const configured = (
      this.configService.get<string>('LLM_PROVIDER') || 'ollama'
    )
      .trim()
      .toLowerCase();

    if (configured === 'ollama') {
      return this.ollamaProvider;
    }

    if (configured === 'openrouter') {
      return this.openRouterProvider;
    }

    this.logger.error(
      `[LlmService] Unsupported LLM_PROVIDER configured: "${configured}"`,
    );
    throw new ServiceUnavailableException(
      `Unsupported LLM_PROVIDER "${configured}". Supported values are "ollama" and "openrouter".`,
    );
  }

  get providerName(): string {
    return this.resolveProvider().providerName;
  }

  get modelName(): string {
    return this.resolveProvider().modelName;
  }

  async generateAnswer(params: LlmGenerateParams): Promise<LlmGenerateResult> {
    const provider = this.resolveProvider();
    return provider.generateAnswer(params);
  }
}

