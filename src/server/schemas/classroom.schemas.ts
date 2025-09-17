import { z } from 'zod';

/**
 * Classroom Data Schemas
 * Used across Google Classroom API, Apps Script, and Convex boundaries
 */

// Base classroom schema for Google Classroom API responses
export const GoogleClassroomSchema = z.object({
  id: z.string().min(1, 'Classroom ID is required'),
  name: z.string().min(1, 'Classroom name is required'),
  ownerId: z.string().min(1, 'Owner ID is required'),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
  enrollmentCode: z.string().optional(),
  section: z.string().optional(),
  description: z.string().optional(),
  room: z.string().optional(),
  descriptionHeading: z.string().optional(),
  alternateLink: z.string().url().optional(),
  teacherGroupEmail: z.string().email().optional(),
  guardianInvitationsEnabled: z.boolean().optional(),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
});

// Normalized classroom schema for internal use
export const ClassroomSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().email('Must be a valid email'),
  courseId: z.string().min(1, 'Course ID is required'),
  courseName: z.string().min(1, 'Course name is required'),
  ownerId: z.string().min(1, 'Owner ID is required'),
  enrollmentCode: z.string().optional(),
  room: z.string().optional(),
  section: z.string().optional(),
  descriptionHeading: z.string().optional(),
  description: z.string().optional(),
  alternateLink: z.string().url().optional(),
  teacherGroupEmail: z.string().email().optional(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
  guardianInvitationsEnabled: z.boolean().default(false),
  creationTime: z.string().datetime().optional(),
  updateTime: z.string().datetime().optional(),
  lastSyncTime: z.number().int().positive(),
});

// Schema for classroom sync from Apps Script
export const ClassroomSyncSchema = z.object({
  userId: z.string().email(),
  classrooms: z.array(GoogleClassroomSchema),
  syncTimestamp: z.number().int().positive(),
  syncSource: z.literal('google_classroom'),
});

// Schema for classroom creation/update operations
export const ClassroomMutationSchema = z.object({
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

// Schema for classroom query parameters
export const ClassroomQuerySchema = z.object({
  userId: z.string().email(),
  courseId: z.string().optional(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

// Schema for classroom statistics
export const ClassroomStatsSchema = z.object({
  classroomId: z.string().uuid(),
  totalAssignments: z.number().int().nonnegative(),
  totalSubmissions: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(100).optional(),
  lastActivity: z.number().int().positive().optional(),
  studentCount: z.number().int().nonnegative(),
});

// Type exports for TypeScript
export type GoogleClassroom = z.infer<typeof GoogleClassroomSchema>;
export type Classroom = z.infer<typeof ClassroomSchema>;
export type ClassroomSync = z.infer<typeof ClassroomSyncSchema>;
export type ClassroomMutation = z.infer<typeof ClassroomMutationSchema>;
export type ClassroomQuery = z.infer<typeof ClassroomQuerySchema>;
export type ClassroomStats = z.infer<typeof ClassroomStatsSchema>;

// Validation helper functions
export function validateGoogleClassroom(data: unknown): GoogleClassroom {
  return GoogleClassroomSchema.parse(data);
}

export function validateClassroom(data: unknown): Classroom {
  return ClassroomSchema.parse(data);
}

export function validateClassroomSync(data: unknown): ClassroomSync {
  return ClassroomSyncSchema.parse(data);
}

export function isValidClassroomMutation(data: unknown): data is ClassroomMutation {
  return ClassroomMutationSchema.safeParse(data).success;
}

// Schema transformation helpers
export function transformGoogleClassroomToInternal(
  googleClassroom: GoogleClassroom,
  userId: string
): Omit<Classroom, 'id'> {
  return {
    userId,
    courseId: googleClassroom.id,
    courseName: googleClassroom.name,
    ownerId: googleClassroom.ownerId,
    enrollmentCode: googleClassroom.enrollmentCode,
    room: googleClassroom.room,
    section: googleClassroom.section,
    descriptionHeading: googleClassroom.descriptionHeading,
    description: googleClassroom.description,
    alternateLink: googleClassroom.alternateLink,
    teacherGroupEmail: googleClassroom.teacherGroupEmail,
    courseState: googleClassroom.courseState,
    guardianInvitationsEnabled: googleClassroom.guardianInvitationsEnabled ?? false,
    creationTime: googleClassroom.creationTime,
    updateTime: googleClassroom.updateTime,
    lastSyncTime: Date.now(),
  };
}