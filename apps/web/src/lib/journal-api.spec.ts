import { describe, it, expect, vi, beforeEach } from 'vitest';
import { journalApi } from './journal-api';

describe('journalApi client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists paginated journal entries with credentials', async () => {
    const mockData = {
      items: [
        {
          id: 'entry-1',
          title: 'First Entry',
          content: 'Hello World',
          userId: 'user-1',
          createdAt: '2026-10-24T00:00:00.000Z',
          updatedAt: '2026-10-24T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    });

    const result = await journalApi.list({ page: 1, limit: 10, search: 'First' });
    expect(result.items).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/journals?page=1&limit=10&search=First'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('creates an entry successfully', async () => {
    const newEntry = {
      id: 'entry-2',
      title: 'New',
      content: 'Content',
      userId: 'user-1',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(newEntry),
    });

    const result = await journalApi.create({ title: 'New', content: 'Content' });
    expect(result.id).toBe('entry-2');
  });

  it('updates an entry successfully', async () => {
    const updatedEntry = {
      id: 'entry-2',
      title: 'Updated',
      content: 'Content',
      userId: 'user-1',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(updatedEntry),
    });

    const result = await journalApi.update('entry-2', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('deletes an entry successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: 'Journal entry deleted successfully', id: 'entry-2' }),
    });

    const result = await journalApi.delete('entry-2');
    expect(result.id).toBe('entry-2');
  });
});

