import { z } from 'zod';

export const createJournalEntrySchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must not exceed 255 characters')
    .trim(),
  content: z
    .string()
    .min(1, 'Content is required')
    .trim(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

export const queryJournalEntrySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type QueryJournalEntryInput = z.infer<typeof queryJournalEntrySchema>;

