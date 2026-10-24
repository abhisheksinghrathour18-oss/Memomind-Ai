import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { RagAskRequest } from '@memomind/shared';

export class AskQuestionDto implements RagAskRequest {
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  @MaxLength(1000, { message: 'Question cannot exceed 1000 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  question!: string;
}

