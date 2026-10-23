import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { HealthCheckResponse } from '@memomind/shared';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    let dbConnected = false;
    let pgvectorInstalled = false;
    let pgvectorVersion: string | undefined;
    let dbError: string | undefined;

    try {
      // 1. Check basic DB connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;

      // 2. Check pgvector extension status
      const vectorCheck = await this.prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
        SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
      `;

      if (vectorCheck.length > 0) {
        pgvectorInstalled = true;
        pgvectorVersion = vectorCheck[0].extversion;
      }
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : String(err);
      this.logger.error('Health check database error:', dbError);
    }

    const isHealthy = dbConnected && pgvectorInstalled;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      database: {
        connected: dbConnected,
        pgvector: pgvectorInstalled,
        version: pgvectorVersion,
        ...(dbError ? { error: dbError } : {}),
      },
    };
  }
}

