import { z } from "zod";

export const findingSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.enum(["quality", "performance", "security", "architecture"]),
  file: z.string().describe("Path of the file this finding relates to"),
  lineHint: z
    .string()
    .optional()
    .describe("Approximate line number or symbol name if known"),
  issue: z.string().describe("What is wrong or risky"),
  recommendation: z.string().describe("Concrete fix or mitigation"),
});

export const scoresSchema = z.object({
  quality: z.number().min(0).max(10),
  performance: z.number().min(0).max(10),
  security: z.number().min(0).max(10),
  architecture: z.number().min(0).max(10),
});

export const batchReviewSchema = z.object({
  scores: scoresSchema,
  findings: z.array(findingSchema),
  architectureNotes: z
    .array(z.string())
    .describe("High-level architecture observations for this batch"),
  summary: z.string().describe("Short summary of this batch"),
});

export type Finding = z.infer<typeof findingSchema>;
export type Scores = z.infer<typeof scoresSchema>;
export type BatchReview = z.infer<typeof batchReviewSchema>;

export interface ReviewReport {
  repo: string;
  ref: string;
  provider: string;
  model: string;
  filesReviewed: string[];
  scores: Scores;
  findings: Finding[];
  architectureNotes: string[];
  summary: string;
  generatedAt: string;
}
