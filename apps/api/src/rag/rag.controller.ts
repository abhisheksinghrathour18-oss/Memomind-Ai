import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RagAskResponse } from '@memomind/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AskQuestionDto } from './dto/ask-question.dto';
import { RagService } from './rag.service';

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  async ask(
    @CurrentUser('id') userId: string,
    @Body() dto: AskQuestionDto,
  ): Promise<RagAskResponse> {
    return this.ragService.ask(userId, dto);
  }
}

