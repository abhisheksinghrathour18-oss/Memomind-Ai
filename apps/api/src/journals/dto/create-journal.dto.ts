import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  content!: string;
}
