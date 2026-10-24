import {
  CreateJournalEntryInput,
  JournalEntryContract,
  PaginatedJournalsResponse,
  UpdateJournalEntryInput,
} from '@memomind/shared';
import { API_BASE_URL, AuthError } from './auth-api';

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

export const journalApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedJournalsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const url = `${API_BASE_URL}/journals${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    return handleResponse<PaginatedJournalsResponse>(res);
  },

  async get(id: string): Promise<JournalEntryContract> {
    const res = await fetch(`${API_BASE_URL}/journals/${id}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    return handleResponse<JournalEntryContract>(res);
  },

  async create(data: CreateJournalEntryInput): Promise<JournalEntryContract> {
    const res = await fetch(`${API_BASE_URL}/journals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse<JournalEntryContract>(res);
  },

  async update(
    id: string,
    data: UpdateJournalEntryInput,
  ): Promise<JournalEntryContract> {
    const res = await fetch(`${API_BASE_URL}/journals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse<JournalEntryContract>(res);
  },

  async delete(id: string): Promise<{ message: string; id: string }> {
    const res = await fetch(`${API_BASE_URL}/journals/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    return handleResponse<{ message: string; id: string }>(res);
  },
};

