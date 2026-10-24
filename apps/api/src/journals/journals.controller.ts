import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JournalEntryContract, PaginatedJournalsResponse } from '@memomind/shared';

@Controller('journals')
@UseGuards(JwtAuthGuard)
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJournalDto,
  ): Promise<JournalEntryContract> {
    return this.journalsService.create(userId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedJournalsResponse> {
    return this.journalsService.findAll(userId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<JournalEntryContract> {
    return this.journalsService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJournalDto,
  ): Promise<JournalEntryContract> {
    return this.journalsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string; id: string }> {
    return this.journalsService.delete(userId, id);
  }
}
