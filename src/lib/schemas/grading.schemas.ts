import { z } from 'zod';

/**
 * Grading and AI Processing Schemas
 * Handles automated grading, AI integration, and feedback generation
 */

// Grading method enum
export const GradingMethodSchema = z.enum(['auto', 'manual', 'ai', 'hybrid']);

// AI provider enum
export const AIProviderSchema = z.enum(['gemini', 'claude', 'openai']);

// Grading result schema
export const GradingResultSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  questionId: z.string(),
  method: GradingMethodSchema,
  pointsEarned: z.number().min(0),
  pointsPossible: z.number().min(0),
  percentage: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  feedback: z.string().optional(),
  reasoning: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  gradedAt: z.number().int().positive(),
  gradedBy: z.string().optional(), // User ID or 'system'
  reviewedBy: z.string().optional(),
  reviewedAt: z.number().int().positive().optional(),
  needsReview: z.boolean().default(false),
});

// AI grading configuration schema
export const AIGradingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: AIProviderSchema.default('gemini'),
  model: z.string().default('gemini-pro'),
  maxTokens: z.number().int().positive().default(1000),
  temperature: z.number().min(0).max(2).default(0.1),
  rubric: z.string().optional(),
  customPrompt: z.string().optional(),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  fallbackToAuto: z.boolean().default(true),
  // Cost and rate limiting
  maxCostPerSubmission: z.number().positive().default(0.10),
  dailyBudget: z.number().positive().default(50.00),
  rateLimit: z.object({
    requestsPerMinute: z.number().int().positive().default(60),
    requestsPerHour: z.number().int().positive().default(1000),
  }),
});

// AI grading request schema
export const AIGradingRequestSchema = z.object({
  submissionId: z.string().uuid(),
  questionId: z.string(),
  questionText: z.string().min(1),
  questionType: z.enum(['SHORT_ANSWER', 'PARAGRAPH', 'MULTIPLE_CHOICE', 'CHECKBOX']),
  studentResponse: z.string(),
  correctAnswer: z.string().optional(),
  rubric: z.string().optional(),
  pointsPossible: z.number().min(0),
  context: z.object({
    subject: z.string().optional(),
    gradeLevel: z.string().optional(),
    assignmentTitle: z.string().optional(),
    additionalInstructions: z.string().optional(),
  }).optional(),
  config: AIGradingConfigSchema.partial(),
});

// AI grading response schema
export const AIGradingResponseSchema = z.object({
  questionId: z.string(),
  pointsEarned: z.number().min(0),
  pointsPossible: z.number().min(0),
  percentage: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  confidence: z.number().min(0).max(1),
  feedback: z.string(),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  processingTime: z.number().positive(),
  tokensUsed: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  model: z.string(),
  provider: AIProviderSchema,
});

// Batch grading job schema
export const BatchGradingJobSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  method: GradingMethodSchema,
  settings: z.object({
    batchSize: z.number().int().positive().max(50).default(10),
    maxConcurrency: z.number().int().positive().max(10).default(3),
    skipAlreadyGraded: z.boolean().default(true),
    retryFailedSubmissions: z.boolean().default(true),
    notifyOnCompletion: z.boolean().default(true),
    publishToClassroom: z.boolean().default(false),
    aiConfig: AIGradingConfigSchema.partial().optional(),
  }),
  progress: z.object({
    totalSubmissions: z.number().int().nonnegative(),
    processedCount: z.number().int().nonnegative(),
    successCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    currentBatch: z.number().int().nonnegative(),
    totalBatches: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
  }),
  timing: z.object({
    startTime: z.number().int().positive().optional(),
    endTime: z.number().int().positive().optional(),
    estimatedCompletion: z.number().int().positive().optional(),
    averageTimePerSubmission: z.number().positive().optional(),
  }),
  costs: z.object({
    totalCost: z.number().nonnegative().default(0),
    averageCostPerSubmission: z.number().nonnegative().default(0),
    tokensUsed: z.number().int().nonnegative().default(0),
  }),
  errors: z.array(z.object({
    submissionId: z.string().uuid(),
    error: z.string(),
    timestamp: z.number().int().positive(),
    retryCount: z.number().int().nonnegative().default(0),
  })),
  results: z.array(GradingResultSchema).optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// Grading session schema for analytics
export const GradingSessionSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  userId: z.string().uuid(),
  sessionType: z.enum(['auto', 'manual', 'bulk', 'review']),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive().optional(),
  submissionsProcessed: z.number().int().nonnegative(),
  submissionsGraded: z.number().int().nonnegative(),
  submissionsFailed: z.number().int().nonnegative(),
  averageTimePerSubmission: z.number().positive().optional(),
  totalCost: z.number().nonnegative().default(0),
  errors: z.array(z.string()),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  metadata: z.record(z.any()).optional(),
});

// Feedback template schema
export const FeedbackTemplateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  questionType: z.enum(['SHORT_ANSWER', 'PARAGRAPH', 'MULTIPLE_CHOICE', 'CHECKBOX', 'ANY']),
  template: z.string().min(1),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(['string', 'number', 'boolean']),
    required: z.boolean().default(false),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()),
  usageCount: z.number().int().nonnegative().default(0),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// Rubric schema
export const RubricSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  criteria: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string(),
    weight: z.number().min(0).max(1).default(1),
    levels: z.array(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string(),
      points: z.number().min(0),
    })),
  })),
  totalPoints: z.number().min(0),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// Grading analytics schema
export const GradingAnalyticsSchema = z.object({
  assignmentId: z.string().uuid(),
  timeRange: z.object({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
  }),
  overview: z.object({
    totalSubmissions: z.number().int().nonnegative(),
    gradedSubmissions: z.number().int().nonnegative(),
    averageScore: z.number().min(0).max(100),
    medianScore: z.number().min(0).max(100),
    standardDeviation: z.number().nonnegative(),
    gradingAccuracy: z.number().min(0).max(1).optional(),
  }),
  methodBreakdown: z.object({
    auto: z.number().int().nonnegative(),
    manual: z.number().int().nonnegative(),
    ai: z.number().int().nonnegative(),
    hybrid: z.number().int().nonnegative(),
  }),
  performance: z.object({
    averageGradingTime: z.number().positive(),
    totalGradingTime: z.number().positive(),
    throughput: z.number().positive(), // submissions per hour
  }),
  costs: z.object({
    totalCost: z.number().nonnegative(),
    costPerSubmission: z.number().nonnegative(),
    aiCosts: z.number().nonnegative(),
  }),
  qualityMetrics: z.object({
    averageConfidence: z.number().min(0).max(1),
    reviewRate: z.number().min(0).max(1),
    accuracyRate: z.number().min(0).max(1).optional(),
  }),
});

// Type exports
export type GradingMethod = z.infer<typeof GradingMethodSchema>;
export type AIProvider = z.infer<typeof AIProviderSchema>;
export type GradingResult = z.infer<typeof GradingResultSchema>;
export type AIGradingConfig = z.infer<typeof AIGradingConfigSchema>;
export type AIGradingRequest = z.infer<typeof AIGradingRequestSchema>;
export type AIGradingResponse = z.infer<typeof AIGradingResponseSchema>;
export type BatchGradingJob = z.infer<typeof BatchGradingJobSchema>;
export type GradingSession = z.infer<typeof GradingSessionSchema>;
export type FeedbackTemplate = z.infer<typeof FeedbackTemplateSchema>;
export type Rubric = z.infer<typeof RubricSchema>;
export type GradingAnalytics = z.infer<typeof GradingAnalyticsSchema>;

// Validation helpers
export function validateGradingResult(data: unknown): GradingResult {
  return GradingResultSchema.parse(data);
}

export function validateAIGradingRequest(data: unknown): AIGradingRequest {
  return AIGradingRequestSchema.parse(data);
}

export function validateBatchGradingJob(data: unknown): BatchGradingJob {
  return BatchGradingJobSchema.parse(data);
}

export function validateRubric(data: unknown): Rubric {
  return RubricSchema.parse(data);
}

export function isValidGradingMethod(method: string): method is GradingMethod {
  return GradingMethodSchema.safeParse(method).success;
}

// Helper functions
export function calculateGradeFromResults(results: GradingResult[]): {
  totalPoints: number;
  maxPoints: number;
  percentage: number;
} {
  const totalPoints = results.reduce((sum, result) => sum + result.pointsEarned, 0);
  const maxPoints = results.reduce((sum, result) => sum + result.pointsPossible, 0);
  const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

  return { totalPoints, maxPoints, percentage };
}

export function needsHumanReview(result: GradingResult, threshold: number = 0.7): boolean {
  return result.confidence !== undefined && result.confidence < threshold;
}

export function estimateBatchGradingTime(
  submissionCount: number,
  method: GradingMethod,
  averageTimePerSubmission: number = 5000 // milliseconds
): number {
  const multiplier = {
    auto: 1,
    manual: 10,
    ai: 3,
    hybrid: 5,
  }[method];

  return submissionCount * averageTimePerSubmission * multiplier;
}

export function calculateGradingCost(
  tokensUsed: number,
  provider: AIProvider,
  model: string
): number {
  // Cost per 1K tokens (approximate)
  const costs = {
    gemini: { 'gemini-pro': 0.0005 },
    claude: { 'claude-3-sonnet': 0.003 },
    openai: { 'gpt-4': 0.03, 'gpt-3.5-turbo': 0.002 },
  };

  const costPer1K = costs[provider]?.[model] ?? 0.001;
  return (tokensUsed / 1000) * costPer1K;
}