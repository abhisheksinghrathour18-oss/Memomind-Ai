import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateJournalDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
  content?: string;
}

