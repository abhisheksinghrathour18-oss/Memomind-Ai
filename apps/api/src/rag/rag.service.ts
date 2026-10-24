import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RagAskResponse, RagSourceCitation } from '@memomind/shared';
import { LLM_PROVIDER, LlmProvider } from '../llm/llm.interface';
import { VectorSearchResult } from '../ai/vector-store/vector-store.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { PromptBuilderService } from './prompt-builder.service';
import { RetrievalService } from './retrieval.service';

export const INSUFFICIENT_EVIDENCE_ANSWER =
  'Your journal does not contain enough evidence to answer this question.';

export const MAX_EXCERPT_LENGTH = 240;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly promptBuilderService: PromptBuilderService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  private formatExcerpt(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= MAX_EXCERPT_LENGTH) {
      return normalized;
    }
    return `${normalized.slice(0, MAX_EXCERPT_LENGTH - 3).trimEnd()}...`;
  }

  /**
   * Builds source citations strictly from the authorized retrieved chunks.
   * Deduplicates by entryId while preserving rank order so citations are never fabricated.
   */
  private buildCitations(chunks: VectorSearchResult[]): RagSourceCitation[] {
    const seenEntries = new Set<string>();
    const citations: RagSourceCitation[] = [];

    for (const chunk of chunks) {
      if (seenEntries.has(chunk.entryId)) {
        continue;
      }
      seenEntries.add(chunk.entryId);
      citations.push({
        entryId: chunk.entryId,
        title: chunk.title,
        createdAt: chunk.createdAt,
        excerpt: this.formatExcerpt(chunk.text),
      });
    }

    return citations;
  }

  async ask(userId: string, dto: AskQuestionDto): Promise<RagAskResponse> {
    if (!userId || !userId.trim()) {
      throw new BadRequestException('Authenticated user ID is required');
    }

    const question = dto.question?.trim();
    if (!question) {
      throw new BadRequestException('Question is required');
    }

    const requestStart = Date.now();
    const providerName = this.llmProvider.providerName;
    const modelName = this.llmProvider.modelName;

    this.logger.log(
      `[RAG] event=rag_request_start tenant=${userId.slice(0, 8)}... questionLength=${question.length} provider=${providerName} model=${modelName}`,
    );

    try {
      // 1-4. Embed question, search pgvector with mandatory user_id filter, and rank chunks
      const { chunks, retrievalDurationMs } =
        await this.retrievalService.retrieve(userId, question);

      if (chunks.length === 0) {
        const totalDurationMs = Date.now() - requestStart;
        this.logger.log(
          `[RAG] event=rag_request_complete tenant=${userId.slice(0, 8)}... retrievedChunks=0 sourcesCount=0 retrievalDurationMs=${retrievalDurationMs} generationDurationMs=0 totalDurationMs=${totalDurationMs} provider=${providerName} model=${modelName}`,
        );
        return {
          answer: INSUFFICIENT_EVIDENCE_ANSWER,
          sources: [],
        };
      }

      // 5. Construct grounded prompt within character budget
      const promptParams = this.promptBuilderService.buildPrompt(
        question,
        chunks,
      );

      // 6. Call selected LLM provider via abstraction interface
      const generationStart = Date.now();
      const generationResult =
        await this.llmProvider.generateAnswer(promptParams);
      const generationDurationMs = Date.now() - generationStart;

      // 7. Return normalized answer and deterministic citations from authorized chunks
      const sources = this.buildCitations(chunks);
      const normalizedAnswer =
        generationResult.answer.trim() || INSUFFICIENT_EVIDENCE_ANSWER;
      const totalDurationMs = Date.now() - requestStart;

      this.logger.log(
        `[RAG] event=rag_request_complete tenant=${userId.slice(0, 8)}... retrievedChunks=${chunks.length} sourcesCount=${sources.length} retrievalDurationMs=${retrievalDurationMs} generationDurationMs=${generationDurationMs} totalDurationMs=${totalDurationMs} provider=${generationResult.provider} model=${generationResult.model}`,
      );

      return {
        answer: normalizedAnswer,
        sources,
      };
    } catch (err: unknown) {
      const totalDurationMs = Date.now() - requestStart;
      const safeReason = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `[RAG] event=rag_request_failed tenant=${userId.slice(0, 8)}... provider=${providerName} model=${modelName} totalDurationMs=${totalDurationMs} reason="${safeReason}"`,
      );
      throw err;
    }
  }
}

