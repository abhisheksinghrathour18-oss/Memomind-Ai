import { z } from 'zod';

export const ragAskQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question is required')
    .max(1000, 'Question must not exceed 1000 characters'),
});

export type RagAskQuestionInput = z.infer<typeof ragAskQuestionSchema>;

export const ragSourceCitationSchema = z.object({
  entryId: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.string().min(1),
  excerpt: z.string(),
});

export const ragAskResponseSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(ragSourceCitationSchema),
});

