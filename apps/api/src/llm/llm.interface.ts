export const LLM_PROVIDER = 'LLM_PROVIDER';

export interface LlmGenerateParams {
  systemPrompt: string;
  question: string;
  context: string;
}

export interface LlmGenerateResult {
  answer: string;
  provider: string;
  model: string;
}

export interface LlmProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateAnswer(params: LlmGenerateParams): Promise<LlmGenerateResult>;
}

