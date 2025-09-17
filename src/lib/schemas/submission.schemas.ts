import { z } from 'zod';
import { QuestionTypeSchema } from './assignment.schemas';

/**
 * Submission Data Schemas
 * Handles student submissions, responses, and grading results
 */

// Submission state from Google Classroom
export const SubmissionStateSchema = z.enum([
  'NEW',
  'CREATED',
  'TURNED_IN',
  'RETURNED',
  'RECLAIMED_BY_STUDENT'
]);

// Response schema for individual question responses
export const ResponseSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  questionTitle: z.string().min(1, 'Question title is required'),
  questionType: QuestionTypeSchema,
  response: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional(),
  textResponse: z.string().optional(),
  fileUploadAnswers: z.array(z.string().url()).optional(),
  // Grading fields
  isCorrect: z.boolean().optional(),
  pointsEarned: z.number().min(0).optional(),
  pointsPossible: z.number().min(0).optional(),
  feedback: z.string().optional(),
  aiGradingResult: z.object({
    score: z.number().min(0),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    suggestions: z.array(z.string()).optional(),
  }).optional(),
});

// Google Classroom submission schema
export const GoogleSubmissionSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  courseWorkId: z.string().min(1),
  userId: z.string().min(1),
  state: SubmissionStateSchema,
  late: z.boolean().optional(),
  draftGrade: z.number().min(0).optional(),
  assignedGrade: z.number().min(0).optional(),
  alternateLink: z.string().url().optional(),
  courseWorkType: z.string().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  submissionHistory: z.array(z.object({
    stateHistory: z.object({
      state: SubmissionStateSchema,
      stateTimestamp: z.string().datetime(),
      actorUserId: z.string().optional(),
    }),
  })).optional(),
});

// Internal submission schema
export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  courseId: z.string().min(1),
  courseWorkId: z.string().min(1),
  formId: z.string().min(1),
  studentId: z.string().min(1),
  studentEmail: z.string().email().optional(),
  studentName: z.string().optional(),
  submissionId: z.string().min(1),
  state: SubmissionStateSchema,
  late: z.boolean().default(false),
  draftGrade: z.number().min(0).optional(),
  assignedGrade: z.number().min(0).optional(),
  alternateLink: z.string().url().optional(),
  courseWorkType: z.string().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  submissionTime: z.number().int().positive(),
  submissionHistory: z.array(z.object({
    stateHistory: z.object({
      state: SubmissionStateSchema,
      stateTimestamp: z.string().datetime(),
      actorUserId: z.string().optional(),
    }),
  })).optional(),
  // Form response data
  responses: z.array(ResponseSchema),
  // Grading results
  autoGraded: z.boolean().default(false),
  gradingResults: z.object({
    totalPoints: z.number().min(0),
    maxPoints: z.number().min(0),
    percentage: z.number().min(0).max(100),
    passed: z.boolean().optional(),
    gradingMethod: z.enum(['auto', 'manual', 'ai', 'hybrid']),
    gradedAt: z.number().int().positive(),
    gradedBy: z.string().optional(),
    confidenceScore: z.number().min(0).max(1).optional(),
  }).optional(),
  score: z.number().min(0).optional(),
  totalScore: z.number().min(0).optional(),
  totalPossible: z.number().min(0).optional(),
  totalPossibleScore: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  percentageScore: z.number().min(0).max(100).optional(),
  gradingTimestamp: z.number().int().positive().optional(),
  lastSyncTime: z.number().int().positive(),
  // Pipeline status tracking
  pipelineStatus: z.object({
    stage: z.enum(['received', 'processing', 'grading', 'completed', 'failed']),
    progress: z.number().min(0).max(1),
    startTime: z.number().int().positive(),
    endTime: z.number().int().positive().optional(),
    errors: z.array(z.string()).optional(),
  }).optional(),
  validationErrors: z.array(z.string()).optional(),
  validationWarnings: z.array(z.string()).optional(),
  // Sync tracking
  lastSyncStatus: z.object({
    success: z.boolean(),
    timestamp: z.number().int().positive(),
    error: z.string().optional(),
    gradePosted: z.number().min(0).optional(),
    syncOperationId: z.string().uuid().optional(),
  }).optional(),
  // Feedback and AI grading
  feedback: z.union([z.string(), z.array(z.string())]).optional(),
  aiGradingResults: z.object({
    overallScore: z.number().min(0),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    suggestions: z.array(z.string()),
    responseAnalysis: z.array(z.object({
      questionId: z.string(),
      analysis: z.string(),
      confidence: z.number().min(0).max(1),
    })),
  }).optional(),
  requiresHumanReview: z.boolean().default(false),
});

// Submission creation schema
export const SubmissionMutationSchema = z.object({
  assignmentId: z.string().uuid(),
  courseId: z.string().min(1),
  courseWorkId: z.string().min(1),
  formId: z.string().min(1),
  studentId: z.string().min(1),
  studentEmail: z.string().email().optional(),
  studentName: z.string().optional(),
  submissionId: z.string().min(1),
  state: SubmissionStateSchema,
  late: z.boolean().default(false),
  draftGrade: z.number().min(0).optional(),
  assignedGrade: z.number().min(0).optional(),
  alternateLink: z.string().url().optional(),
  courseWorkType: z.string().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  submissionTime: z.number().int().positive(),
  responses: z.array(ResponseSchema),
  submissionHistory: z.array(z.object({
    stateHistory: z.object({
      state: SubmissionStateSchema,
      stateTimestamp: z.string().datetime(),
      actorUserId: z.string().optional(),
    }),
  })).optional(),
});

// Submission query schema
export const SubmissionQuerySchema = z.object({
  userId: z.string().email().optional(),
  assignmentId: z.string().uuid().optional(),
  courseId: z.string().optional(),
  studentId: z.string().optional(),
  state: SubmissionStateSchema.optional(),
  autoGraded: z.boolean().optional(),
  late: z.boolean().optional(),
  requiresHumanReview: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['submissionTime', 'gradingTimestamp', 'score', 'studentName']).default('submissionTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Grading request schema
export const GradingRequestSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  gradingMethod: z.enum(['auto', 'manual', 'ai', 'hybrid']).default('auto'),
  overrideExisting: z.boolean().default(false),
  publishToClassroom: z.boolean().default(false),
  notifyStudent: z.boolean().default(false),
  includeDetailedFeedback: z.boolean().default(true),
  aiGradingOptions: z.object({
    provider: z.enum(['gemini', 'claude', 'openai']).optional(),
    model: z.string().optional(),
    rubric: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

// Batch grading schema
export const BatchGradingSchema = z.object({
  assignmentId: z.string().uuid(),
  submissionIds: z.array(z.string().uuid()).max(100),
  gradingMethod: z.enum(['auto', 'manual', 'ai', 'hybrid']).default('auto'),
  batchSize: z.number().int().positive().max(50).default(10),
  maxConcurrency: z.number().int().positive().max(10).default(3),
  skipAlreadyGraded: z.boolean().default(true),
  publishToClassroom: z.boolean().default(false),
  notifyStudents: z.boolean().default(false),
  retryFailedSubmissions: z.boolean().default(true),
  aiGradingOptions: z.object({
    provider: z.enum(['gemini', 'claude', 'openai']).optional(),
    model: z.string().optional(),
    rubric: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

// Type exports
export type SubmissionState = z.infer<typeof SubmissionStateSchema>;
export type Response = z.infer<typeof ResponseSchema>;
export type GoogleSubmission = z.infer<typeof GoogleSubmissionSchema>;
export type Submission = z.infer<typeof SubmissionSchema>;
export type SubmissionMutation = z.infer<typeof SubmissionMutationSchema>;
export type SubmissionQuery = z.infer<typeof SubmissionQuerySchema>;
export type GradingRequest = z.infer<typeof GradingRequestSchema>;
export type BatchGrading = z.infer<typeof BatchGradingSchema>;

// Validation helpers
export function validateGoogleSubmission(data: unknown): GoogleSubmission {
  return GoogleSubmissionSchema.parse(data);
}

export function validateSubmission(data: unknown): Submission {
  return SubmissionSchema.parse(data);
}

export function validateSubmissionMutation(data: unknown): SubmissionMutation {
  return SubmissionMutationSchema.parse(data);
}

export function validateGradingRequest(data: unknown): GradingRequest {
  return GradingRequestSchema.parse(data);
}

export function isValidBatchGrading(data: unknown): data is BatchGrading {
  return BatchGradingSchema.safeParse(data).success;
}

// Transformation helpers
export function transformGoogleSubmissionToInternal(
  googleSubmission: GoogleSubmission,
  assignmentId: string,
  formId: string,
  responses: Response[] = []
): Omit<Submission, 'id'> {
  return {
    assignmentId,
    courseId: googleSubmission.courseId,
    courseWorkId: googleSubmission.courseWorkId,
    formId,
    studentId: googleSubmission.userId,
    studentEmail: undefined,
    studentName: undefined,
    submissionId: googleSubmission.id,
    state: googleSubmission.state,
    late: googleSubmission.late ?? false,
    draftGrade: googleSubmission.draftGrade,
    assignedGrade: googleSubmission.assignedGrade,
    alternateLink: googleSubmission.alternateLink,
    courseWorkType: googleSubmission.courseWorkType,
    creationTime: googleSubmission.creationTime,
    updateTime: googleSubmission.updateTime,
    submissionTime: Date.now(),
    submissionHistory: googleSubmission.submissionHistory,
    responses,
    autoGraded: false,
    lastSyncTime: Date.now(),
    requiresHumanReview: false,
  };
}

export function calculateSubmissionScore(responses: Response[]): {
  totalPoints: number;
  maxPoints: number;
  percentage: number;
} {
  const totalPoints = responses.reduce((sum, response) =>
    sum + (response.pointsEarned ?? 0), 0
  );

  const maxPoints = responses.reduce((sum, response) =>
    sum + (response.pointsPossible ?? 0), 0
  );

  const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

  return { totalPoints, maxPoints, percentage };
}