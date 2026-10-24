import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateJournalDto } from './dto/create-journal.dto';

@Injectable()
export class JournalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateJournalDto) {
    return this.prisma.journalEntry.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId, // Enforce strict tenant ownership at DB write level
      },
    });
  }

  async findAll(userId: string) {
    // Queries strictly conditioned on the authenticated user's ID
    return this.prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    // Tenant boundary check: enforce strict tenant isolation
    if (entry.userId !== userId) {
      throw new ForbiddenException('Access denied: resource belongs to another tenant');
    }

    return entry;
  }
}
