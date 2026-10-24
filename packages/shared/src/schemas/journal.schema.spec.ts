import { describe, it, expect } from 'vitest';
import { createJournalEntrySchema, updateJournalEntrySchema, queryJournalEntrySchema } from './journal.schema.js';

describe('createJournalEntrySchema', () => {
  it('validates valid input correctly', () => {
    const input = {
      title: 'First Journal Entry',
      content: 'Today was an inspiring day of programming.',
    };
    const result = createJournalEntrySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('First Journal Entry');
    }
  });

  it('rejects empty title or content', () => {
    const input = {
      title: '',
      content: '',
    };
    const result = createJournalEntrySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('updateJournalEntrySchema', () => {
  it('allows updating only title', () => {
    const result = updateJournalEntrySchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('allows updating only content', () => {
    const result = updateJournalEntrySchema.safeParse({ content: 'New Content' });
    expect(result.success).toBe(true);
  });

  it('rejects empty object when neither title nor content is provided', () => {
    const result = updateJournalEntrySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('queryJournalEntrySchema', () => {
  it('parses defaults for page and limit', () => {
    const result = queryJournalEntrySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string queries', () => {
    const result = queryJournalEntrySchema.safeParse({ page: '2', limit: '10', search: 'ideas' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
      expect(result.data.search).toBe('ideas');
    }
  });
});
