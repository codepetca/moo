import { z } from 'zod';

/**
 * Convex API Schemas
 * Defines request/response schemas for all Convex functions
 */

// Generic API response schemas
export const ConvexSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  timestamp: z.number().int().positive(),
  requestId: z.string().uuid().optional(),
});

export const ConvexErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.number().int().positive(),
  requestId: z.string().uuid().optional(),
});

export const ConvexResponseSchema = z.union([
  ConvexSuccessResponseSchema,
  ConvexErrorResponseSchema,
]);

// Pagination schemas
export const PaginationRequestSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  cursor: z.string().optional(),
});

export const PaginationResponseSchema = z.object({
  items: z.array(z.any()),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

// Classroom API schemas
export const GetClassroomsRequestSchema = z.object({
  userId: z.string().email(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']).optional(),
  ...PaginationRequestSchema.shape,
});

export const SaveClassroomRequestSchema = z.object({
  userId: z.string().email(),
  courseId: z.string().min(1),
  courseName: z.string().min(1).max(200),
  ownerId: z.string().min(1),
  enrollmentCode: z.string().optional(),
  room: z.string().max(100).optional(),
  section: z.string().max(100).optional(),
  descriptionHeading: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  alternateLink: z.string().url().optional(),
  teacherGroupEmail: z.string().email().optional(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
  guardianInvitationsEnabled: z.boolean().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
});

export const DeleteClassroomRequestSchema = z.object({
  userId: z.string().email(),
  classroomId: z.string().uuid(),
});

// Assignment API schemas
export const GetAssignmentsRequestSchema = z.object({
  userId: z.string().email(),
  courseId: z.string().optional(),
  state: z.enum(['PUBLISHED', 'DRAFT', 'DELETED']).optional(),
  ...PaginationRequestSchema.shape,
});

export const SaveAssignmentRequestSchema = z.object({
  userId: z.string().email(),
  courseId: z.string().min(1),
  courseWorkId: z.string().min(1),
  formId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  subject: z.string().max(100).optional(),
  state: z.enum(['PUBLISHED', 'DRAFT', 'DELETED']),
  alternateLink: z.string().url().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  maxPoints: z.number().positive().optional(),
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']),
  submissionModificationMode: z.enum(['MODIFIABLE_UNTIL_TURNED_IN', 'MODIFIABLE', 'NOT_MODIFIABLE']).optional(),
  assigneeMode: z.enum(['ALL_STUDENTS', 'INDIVIDUAL_STUDENTS']).optional(),
  creatorUserId: z.string().optional(),
  questions: z.array(z.any()).optional(),
  classroomSyncConfig: z.any().optional(),
  publicationConfig: z.any().optional(),
});

export const DeleteAssignmentRequestSchema = z.object({
  userId: z.string().email(),
  assignmentId: z.string().uuid(),
});

// Submission API schemas
export const GetSubmissionsRequestSchema = z.object({
  userId: z.string().email().optional(),
  assignmentId: z.string().uuid().optional(),
  courseId: z.string().optional(),
  studentId: z.string().optional(),
  state: z.enum(['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT']).optional(),
  autoGraded: z.boolean().optional(),
  ...PaginationRequestSchema.shape,
});

export const SaveSubmissionRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  courseId: z.string().min(1),
  courseWorkId: z.string().min(1),
  formId: z.string().min(1),
  studentId: z.string().min(1),
  studentEmail: z.string().email().optional(),
  studentName: z.string().optional(),
  submissionId: z.string().min(1),
  state: z.enum(['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT']),
  late: z.boolean().default(false),
  draftGrade: z.number().min(0).optional(),
  assignedGrade: z.number().min(0).optional(),
  alternateLink: z.string().url().optional(),
  courseWorkType: z.string().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  submissionTime: z.number().int().positive(),
  responses: z.array(z.any()),
  submissionHistory: z.array(z.any()).optional(),
});

// Grading API schemas
export const GradeSubmissionRequestSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  userId: z.string().email(),
  gradingMethod: z.enum(['auto', 'manual', 'ai', 'hybrid']).default('auto'),
  overrideExisting: z.boolean().default(false),
  publishToClassroom: z.boolean().default(false),
  notifyStudent: z.boolean().default(false),
  aiGradingOptions: z.object({
    provider: z.enum(['gemini', 'claude', 'openai']).optional(),
    model: z.string().optional(),
    rubric: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

export const BatchGradeRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  userId: z.string().email(),
  submissionIds: z.array(z.string().uuid()).max(100),
  gradingMethod: z.enum(['auto', 'manual', 'ai', 'hybrid']).default('auto'),
  settings: z.object({
    batchSize: z.number().int().positive().max(50).default(10),
    maxConcurrency: z.number().int().positive().max(10).default(3),
    skipAlreadyGraded: z.boolean().default(true),
    retryFailedSubmissions: z.boolean().default(true),
    notifyOnCompletion: z.boolean().default(true),
    publishToClassroom: z.boolean().default(false),
  }),
  aiGradingOptions: z.object({
    provider: z.enum(['gemini', 'claude', 'openai']).optional(),
    model: z.string().optional(),
    rubric: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

// Analytics API schemas
export const GetDashboardSummaryRequestSchema = z.object({
  userId: z.string().email(),
  timeRange: z.object({
    start: z.number().int().positive().optional(),
    end: z.number().int().positive().optional(),
  }).optional(),
});

export const GetClassroomAnalyticsRequestSchema = z.object({
  userId: z.string().email(),
  classroomId: z.string().uuid(),
  timeRange: z.object({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
  }),
  metrics: z.array(z.enum([
    'submissions',
    'grades',
    'engagement',
    'performance',
    'completion_rate'
  ])).default(['submissions', 'grades']),
});

export const GetAssignmentAnalyticsRequestSchema = z.object({
  userId: z.string().email(),
  assignmentId: z.string().uuid(),
  includeIndividualResponses: z.boolean().default(false),
  includeGradingDetails: z.boolean().default(false),
});

// Sync API schemas
export const SyncClassroomDataRequestSchema = z.object({
  operation: z.literal('classroom_sync'),
  userId: z.string().email(),
  data: z.object({
    courses: z.array(z.any()),
  }),
  metadata: z.object({
    syncSource: z.literal('google_apps_script'),
    version: z.string(),
    totalRecords: z.number().int().nonnegative(),
    syncDuration: z.number().positive().optional(),
  }),
  timestamp: z.number().int().positive(),
});

export const SyncAssignmentDataRequestSchema = z.object({
  operation: z.literal('assignment_sync'),
  userId: z.string().email(),
  data: z.object({
    courseWork: z.array(z.any()),
    forms: z.array(z.any()).optional(),
  }),
  metadata: z.object({
    syncSource: z.literal('google_apps_script'),
    version: z.string(),
    totalRecords: z.number().int().nonnegative(),
    syncDuration: z.number().positive().optional(),
  }),
  timestamp: z.number().int().positive(),
});

export const SyncSubmissionDataRequestSchema = z.object({
  operation: z.literal('submission_sync'),
  userId: z.string().email(),
  data: z.object({
    submissions: z.array(z.any()),
    responses: z.array(z.any()).optional(),
  }),
  metadata: z.object({
    syncSource: z.literal('google_apps_script'),
    version: z.string(),
    totalRecords: z.number().int().nonnegative(),
    syncDuration: z.number().positive().optional(),
  }),
  timestamp: z.number().int().positive(),
});

// User management API schemas
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['teacher', 'student', 'admin']),
  avatar: z.string().url().optional(),
  googleId: z.string().optional(),
  domain: z.string().optional(),
  schoolId: z.string().optional(),
  department: z.string().optional(),
});

export const UpdateUserRequestSchema = z.object({
  userId: z.string().uuid(),
  updates: z.object({
    name: z.string().min(1).max(100).optional(),
    avatar: z.string().url().optional(),
    department: z.string().optional(),
    preferences: z.any().optional(),
    integrationSettings: z.any().optional(),
  }),
});

export const GetUsersRequestSchema = z.object({
  role: z.enum(['teacher', 'student', 'admin']).optional(),
  domain: z.string().optional(),
  schoolId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  ...PaginationRequestSchema.shape,
});

// Type exports
export type ConvexSuccessResponse = z.infer<typeof ConvexSuccessResponseSchema>;
export type ConvexErrorResponse = z.infer<typeof ConvexErrorResponseSchema>;
export type ConvexResponse = z.infer<typeof ConvexResponseSchema>;
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;

// Classroom API types
export type GetClassroomsRequest = z.infer<typeof GetClassroomsRequestSchema>;
export type SaveClassroomRequest = z.infer<typeof SaveClassroomRequestSchema>;
export type DeleteClassroomRequest = z.infer<typeof DeleteClassroomRequestSchema>;

// Assignment API types
export type GetAssignmentsRequest = z.infer<typeof GetAssignmentsRequestSchema>;
export type SaveAssignmentRequest = z.infer<typeof SaveAssignmentRequestSchema>;
export type DeleteAssignmentRequest = z.infer<typeof DeleteAssignmentRequestSchema>;

// Submission API types
export type GetSubmissionsRequest = z.infer<typeof GetSubmissionsRequestSchema>;
export type SaveSubmissionRequest = z.infer<typeof SaveSubmissionRequestSchema>;

// Grading API types
export type GradeSubmissionRequest = z.infer<typeof GradeSubmissionRequestSchema>;
export type BatchGradeRequest = z.infer<typeof BatchGradeRequestSchema>;

// Analytics API types
export type GetDashboardSummaryRequest = z.infer<typeof GetDashboardSummaryRequestSchema>;
export type GetClassroomAnalyticsRequest = z.infer<typeof GetClassroomAnalyticsRequestSchema>;
export type GetAssignmentAnalyticsRequest = z.infer<typeof GetAssignmentAnalyticsRequestSchema>;

// Sync API types
export type SyncClassroomDataRequest = z.infer<typeof SyncClassroomDataRequestSchema>;
export type SyncAssignmentDataRequest = z.infer<typeof SyncAssignmentDataRequestSchema>;
export type SyncSubmissionDataRequest = z.infer<typeof SyncSubmissionDataRequestSchema>;

// User management API types
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type GetUsersRequest = z.infer<typeof GetUsersRequestSchema>;

// Validation helpers
export function validateConvexRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}

export function createSuccessResponse<T>(data: T, requestId?: string): ConvexSuccessResponse {
  return {
    success: true,
    data,
    timestamp: Date.now(),
    requestId,
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string
): ConvexErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
    requestId,
  };
}

export function isConvexError(response: ConvexResponse): response is ConvexErrorResponse {
  return !response.success;
}

// Helper for creating paginated responses
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  request: PaginationRequest
): PaginationResponse {
  const hasMore = request.offset + request.limit < total;
  const nextCursor = hasMore ?
    Buffer.from(JSON.stringify({ offset: request.offset + request.limit })).toString('base64') :
    undefined;

  return {
    items,
    total,
    hasMore,
    nextCursor,
    limit: request.limit,
    offset: request.offset,
  };
}

// Schema validation middleware for Convex functions
export function withValidation<TInput, TOutput>(
  inputSchema: z.ZodSchema<TInput>,
  handler: (input: TInput) => Promise<TOutput> | TOutput
) {
  return async (input: unknown): Promise<ConvexResponse> => {
    try {
      const validatedInput = inputSchema.parse(input);
      const result = await handler(validatedInput);
      return createSuccessResponse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid input parameters',
          error.errors
        );
      }

      return createErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  };
}