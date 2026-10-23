import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHealth, API_BASE_URL } from './api';

describe('Web API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has a default API base URL', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  it('fetches health data successfully', async () => {
    const mockHealth = {
      status: 'ok',
      timestamp: '2026-10-23T12:00:00.000Z',
      uptime: 100,
      environment: 'development',
      database: {
        connected: true,
        pgvector: true,
        version: '0.8.7',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockHealth),
    });

    const result = await fetchHealth();
    expect(result).toEqual(mockHealth);
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/health`, {
      cache: 'no-store',
    });
  });

  it('throws error when health endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(fetchHealth()).rejects.toThrow('Health check failed with status: 503');
  });
});

