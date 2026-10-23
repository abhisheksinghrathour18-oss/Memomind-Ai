import { describe, it, expect } from 'vitest';
import { createJournalEntrySchema } from './journal.schema.js';

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
