import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Response } from 'express';

describe('HealthController', () => {
  it('returns ok status when database and pgvector are healthy', async () => {
    const mockHealthService = {
      checkHealth: vi.fn().mockResolvedValue({
        status: 'ok',
        timestamp: '2026-10-23T12:00:00.000Z',
        uptime: 120,
        environment: 'test',
        database: {
          connected: true,
          pgvector: true,
          version: '0.8.7',
        },
      }),
    } as unknown as HealthService;

    const controller = new HealthController(mockHealthService);
    const mockResponse = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await controller.getHealth(mockResponse);

    expect(result.status).toBe('ok');
    expect(result.database.connected).toBe(true);
    expect(result.database.pgvector).toBe(true);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('sets 503 response code when health status is degraded', async () => {
    const mockHealthService = {
      checkHealth: vi.fn().mockResolvedValue({
        status: 'degraded',
        timestamp: '2026-10-23T12:00:00.000Z',
        uptime: 10,
        environment: 'test',
        database: {
          connected: false,
          pgvector: false,
          error: 'Connection refused',
        },
      }),
    } as unknown as HealthService;

    const controller = new HealthController(mockHealthService);
    const mockResponse = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await controller.getHealth(mockResponse);

    expect(result.status).toBe('degraded');
    expect(mockResponse.status).toHaveBeenCalledWith(503);
  });
});
