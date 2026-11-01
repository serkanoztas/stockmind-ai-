import { z } from 'zod';

export const aiAskSchema = z.object({
  body: z.object({
    question: z.string().min(2, 'Question must be at least 2 characters long'),
  }),
});

export const aiRecommendationItemSchema = z.object({
  title: z.string(),
  actionType: z.enum(['REORDER', 'PRICING', 'DISCOUNT', 'INSPECT_EXPIRED', 'GENERAL']),
  description: z.string(),
  productId: z.string().optional(),
  suggestedQuantity: z.number().optional(),
});

export const aiStructuredResponseSchema = z.object({
  summary: z.string(),
  findings: z.array(z.string()),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      change: z.string().optional(),
    })
  ),
  recommendations: z.array(aiRecommendationItemSchema),
  limitations: z.string().optional(),
});

export type AiStructuredResponse = z.infer<typeof aiStructuredResponseSchema>;