import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateJournalDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.trim() : value))
  content!: string;
}
