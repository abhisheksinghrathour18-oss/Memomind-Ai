import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm.interface';
import { LlmService } from './llm.service';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';

@Module({
  providers: [
    OllamaProvider,
    OpenRouterProvider,
    LlmService,
    {
      provide: LLM_PROVIDER,
      useExisting: LlmService,
    },
  ],
  exports: [LlmService, LLM_PROVIDER],
})
export class LlmModule {}

