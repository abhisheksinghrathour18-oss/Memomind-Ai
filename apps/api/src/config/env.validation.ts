import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum LlmProviderType {
  Ollama = 'ollama',
  OpenRouter = 'openrouter',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'memomind-dev-secret-change-in-production-min-32-chars';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  EMBEDDING_PROVIDER: string = 'openai';

  @IsString()
  @IsOptional()
  EMBEDDING_API_KEY?: string;

  @IsString()
  @IsOptional()
  EMBEDDING_MODEL: string = 'text-embedding-3-small';

  @IsString()
  @IsOptional()
  EMBEDDING_BASE_URL: string = 'https://api.openai.com/v1';

  @IsNumber()
  @IsOptional()
  EMBEDDING_DIMENSIONS: number = 1536;

  @IsEnum(LlmProviderType, {
    message: 'LLM_PROVIDER must be either "ollama" or "openrouter"',
  })
  @IsOptional()
  LLM_PROVIDER: LlmProviderType = LlmProviderType.Ollama;

  @IsString()
  @IsOptional()
  LLM_BASE_URL?: string;

  @IsString()
  @IsOptional()
  LLM_API_KEY?: string;

  @IsString()
  @IsOptional()
  LLM_MODEL?: string;

  @IsNumber()
  @IsOptional()
  RAG_TOP_K: number = 5;

  @IsNumber()
  @IsOptional()
  RAG_SIMILARITY_THRESHOLD: number = 0.25;

  @IsNumber()
  @IsOptional()
  RAG_MAX_CONTEXT_CHARS: number = 6000;
}


export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.map(e => Object.values(e.constraints ?? {})).flat().join(', ')}`);
  }
  return validatedConfig;
}
