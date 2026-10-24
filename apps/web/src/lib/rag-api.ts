import { RagAskRequest, RagAskResponse } from '@memomind/shared';
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

export const ragApi = {
  async ask(question: string): Promise<RagAskResponse> {
    const payload: RagAskRequest = { question: question.trim() };

    const res = await fetch(`${API_BASE_URL}/rag/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    return handleResponse<RagAskResponse>(res);
  },
};

