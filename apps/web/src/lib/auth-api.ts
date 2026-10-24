import { AuthResponse, LoginInput, RegisterInput, UserDto } from '@memomind/shared';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class AuthError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      (data && typeof data === 'object' && 'message' in data
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        : null) || `Request failed with status ${res.status}`;
    throw new AuthError(errorMsg, res.status);
  }

  return data as T;
}

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    return handleResponse<AuthResponse>(res);
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    return handleResponse<AuthResponse>(res);
  },

  async logout(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(res);
  },

  async getMe(): Promise<UserDto> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return handleResponse<UserDto>(res);
  },
};

