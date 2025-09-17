import { z } from 'zod';

/**
 * Assignment Data Schemas
 * Handles Google Classroom assignments, Google Forms, and grading configurations
 */

// Question type enum
export const QuestionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'CHECKBOX',
  'SHORT_ANSWER',
  'PARAGRAPH',
  'SCALE',
  'GRID',
  'DATE',
  'TIME',
  'FILE_UPLOAD',
]);

// Question schema for forms
export const QuestionSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  title: z.string().min(1, 'Question title is required'),
  description: z.string().optional(),
  required: z.boolean().default(false),
  questionType: QuestionTypeSchema,
  choices: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  correctAnswers: z.array(z.string()).optional(),
  points: z.number().int().nonnegative().default(0),
  partialCredit: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
  exactMatch: z.boolean().default(false),
  // Advanced grading options
  gradingRules: z.array(z.object({
    type: z.enum(['contains', 'starts_with', 'ends_with', 'regex', 'numeric_range']),
    value: z.string(),
    points: z.number(),
  })).optional(),
});

// Google Classroom assignment schema
export const GoogleAssignmentSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  state: z.enum(['PUBLISHED', 'DRAFT', 'DELETED']),
  alternateLink: z.string().url().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  dueDate: z.object({
    year: z.number(),
    month: z.number(),
    day: z.number(),
  }).optional(),
  dueTime: z.object({
    hours: z.number(),
    minutes: z.number(),
  }).optional(),
  maxPoints: z.number().positive().optional(),
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']),
  submissionModificationMode: z.enum(['MODIFIABLE_UNTIL_TURNED_IN', 'MODIFIABLE', 'NOT_MODIFIABLE']).optional(),
  assigneeMode: z.enum(['ALL_STUDENTS', 'INDIVIDUAL_STUDENTS']).optional(),
  creatorUserId: z.string().optional(),
});

// Internal assignment schema
export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().email('Must be a valid email'),
  courseId: z.string().min(1, 'Course ID is required'),
  courseWorkId: z.string().min(1, 'CourseWork ID is required'),
  formId: z.string().min(1, 'Form ID is required'),
  title: z.string().min(1, 'Title is required').max(500),
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
  lastSyncTime: z.number().int().positive(),
  // Enhanced fields
  questions: z.array(QuestionSchema).optional(),
  classroomSyncConfig: z.object({
    syncGrades: z.boolean().default(true),
    notifyStudents: z.boolean().default(false),
    includeComments: z.boolean().default(true),
  }).optional(),
  publicationConfig: z.object({
    autoPublish: z.boolean().default(false),
    publishDelay: z.number().int().nonnegative().default(0),
  }).optional(),
  publicationStatus: z.object({
    published: z.boolean().default(false),
    publishedAt: z.number().int().positive().optional(),
    publishedBy: z.string().optional(),
  }).optional(),
});

// Grading configuration schema
export const GradingConfigSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  formId: z.string().min(1),
  formTitle: z.string().min(1),
  formDescription: z.string().optional(),
  totalPoints: z.number().int().nonnegative(),
  questions: z.array(QuestionSchema),
  autoGradingEnabled: z.boolean().default(true),
  lastUpdated: z.number().int().positive(),
  // Advanced grading configuration
  gradingRules: z.array(z.object({
    questionId: z.string(),
    type: z.enum(['exact_match', 'partial_match', 'ai_grading', 'manual_only']),
    config: z.record(z.any()),
  })).optional(),
  aiGradingConfig: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['gemini', 'claude', 'openai']).optional(),
    model: z.string().optional(),
    rubric: z.string().optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

// Assignment creation/update schema
export const AssignmentMutationSchema = z.object({
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
  questions: z.array(QuestionSchema).optional(),
  classroomSyncConfig: z.object({
    syncGrades: z.boolean().default(true),
    notifyStudents: z.boolean().default(false),
    includeComments: z.boolean().default(true),
  }).optional(),
});

// Assignment query schema
export const AssignmentQuerySchema = z.object({
  userId: z.string().email(),
  courseId: z.string().optional(),
  assignmentId: z.string().uuid().optional(),
  state: z.enum(['PUBLISHED', 'DRAFT', 'DELETED']).optional(),
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['creationTime', 'updateTime', 'dueDate', 'title']).default('updateTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Assignment statistics schema
export const AssignmentStatsSchema = z.object({
  assignmentId: z.string().uuid(),
  totalSubmissions: z.number().int().nonnegative(),
  gradedSubmissions: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(100).optional(),
  highestScore: z.number().min(0).max(100).optional(),
  lowestScore: z.number().min(0).max(100).optional(),
  submissionRate: z.number().min(0).max(1),
  onTimeSubmissions: z.number().int().nonnegative(),
  lateSubmissions: z.number().int().nonnegative(),
  lastSubmissionTime: z.number().int().positive().optional(),
});

// Type exports
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type GoogleAssignment = z.infer<typeof GoogleAssignmentSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type GradingConfig = z.infer<typeof GradingConfigSchema>;
export type AssignmentMutation = z.infer<typeof AssignmentMutationSchema>;
export type AssignmentQuery = z.infer<typeof AssignmentQuerySchema>;
export type AssignmentStats = z.infer<typeof AssignmentStatsSchema>;

// Validation helpers
export function validateGoogleAssignment(data: unknown): GoogleAssignment {
  return GoogleAssignmentSchema.parse(data);
}

export function validateAssignment(data: unknown): Assignment {
  return AssignmentSchema.parse(data);
}

export function validateGradingConfig(data: unknown): GradingConfig {
  return GradingConfigSchema.parse(data);
}

export function isValidAssignmentMutation(data: unknown): data is AssignmentMutation {
  return AssignmentMutationSchema.safeParse(data).success;
}

// Transformation helpers
export function transformGoogleAssignmentToInternal(
  googleAssignment: GoogleAssignment,
  userId: string,
  formId: string
): Omit<Assignment, 'id'> {
  const dueDate = googleAssignment.dueDate && googleAssignment.dueTime
    ? new Date(
        googleAssignment.dueDate.year,
        googleAssignment.dueDate.month - 1, // JavaScript months are 0-indexed
        googleAssignment.dueDate.day,
        googleAssignment.dueTime.hours,
        googleAssignment.dueTime.minutes
      ).toISOString()
    : googleAssignment.dueDate
    ? new Date(
        googleAssignment.dueDate.year,
        googleAssignment.dueDate.month - 1,
        googleAssignment.dueDate.day
      ).toISOString()
    : undefined;

  return {
    userId,
    courseId: googleAssignment.courseId,
    courseWorkId: googleAssignment.id,
    formId,
    title: googleAssignment.title,
    description: googleAssignment.description,
    subject: undefined,
    state: googleAssignment.state,
    alternateLink: googleAssignment.alternateLink,
    creationTime: googleAssignment.creationTime,
    updateTime: googleAssignment.updateTime,
    dueDate,
    maxPoints: googleAssignment.maxPoints,
    workType: googleAssignment.workType,
    submissionModificationMode: googleAssignment.submissionModificationMode,
    assigneeMode: googleAssignment.assigneeMode,
    creatorUserId: googleAssignment.creatorUserId,
    lastSyncTime: Date.now(),
  };
}