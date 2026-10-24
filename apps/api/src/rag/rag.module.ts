import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { LlmModule } from '../llm/llm.module';
import { PromptBuilderService } from './prompt-builder.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RetrievalService } from './retrieval.service';

@Module({
  imports: [AiModule, LlmModule],
  controllers: [RagController],
  providers: [RetrievalService, PromptBuilderService, RagService],
  exports: [RagService, RetrievalService, PromptBuilderService],
})
export class RagModule {}

