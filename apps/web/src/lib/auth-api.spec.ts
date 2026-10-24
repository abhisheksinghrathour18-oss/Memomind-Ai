import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi, AuthError } from './auth-api';

describe('authApi client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully logs in and receives user data', async () => {
    const mockResponse = {
      user: {
        id: 'u-1',
        email: 'test@example.com',
        name: 'Test',
        createdAt: '2026-10-23T00:00:00.000Z',
        updatedAt: '2026-10-23T00:00:00.000Z',
      },
      message: 'Logged in successfully',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await authApi.login({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('throws AuthError with message on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: 'Invalid email or password' }),
    });

    await expect(
      authApi.login({ email: 'bad@example.com', password: 'wrong' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('calls logout endpoint with credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: 'Logged out successfully' }),
    });

    const res = await authApi.logout();
    expect(res.message).toBe('Logged out successfully');
  });
});

