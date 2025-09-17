import { describe, it, expect } from 'vitest';
import {
  GoogleClassroomSchema,
  ClassroomSchema,
  ClassroomSyncSchema,
  ClassroomMutationSchema,
  ClassroomQuerySchema,
  ClassroomStatsSchema,
  validateGoogleClassroom,
  validateClassroom,
  validateClassroomSync,
  isValidClassroomMutation,
  transformGoogleClassroomToInternal,
  type GoogleClassroom,
  type Classroom,
  type ClassroomSync,
} from './classroom.schemas';

describe('GoogleClassroomSchema', () => {
  const validGoogleClassroom: GoogleClassroom = {
    id: 'course_123',
    name: 'AP Computer Science',
    ownerId: 'teacher_123',
    courseState: 'ACTIVE',
    enrollmentCode: 'ABC123',
    section: 'Period 1',
    description: 'Advanced placement computer science course',
    room: 'Room 101',
    descriptionHeading: 'Course Overview',
    alternateLink: 'https://classroom.google.com/c/course_123',
    teacherGroupEmail: 'apcs-teachers@school.edu',
    guardianInvitationsEnabled: true,
    creationTime: '2024-01-15T08:00:00.000Z',
    updateTime: '2024-01-16T10:30:00.000Z',
  };

  it('should validate a complete valid Google Classroom object', () => {
    expect(() => GoogleClassroomSchema.parse(validGoogleClassroom)).not.toThrow();
  });

  it('should validate minimal required fields only', () => {
    const minimal = {
      id: 'course_123',
      name: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE' as const,
    };
    expect(() => GoogleClassroomSchema.parse(minimal)).not.toThrow();
  });

  it('should reject invalid course states', () => {
    const invalid = { ...validGoogleClassroom, courseState: 'INVALID_STATE' };
    expect(() => GoogleClassroomSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid URLs', () => {
    const invalid = { ...validGoogleClassroom, alternateLink: 'not-a-url' };
    expect(() => GoogleClassroomSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid email addresses', () => {
    const invalid = { ...validGoogleClassroom, teacherGroupEmail: 'not-an-email' };
    expect(() => GoogleClassroomSchema.parse(invalid)).toThrow();
  });

  it('should reject empty required fields', () => {
    const invalidEmpty = { ...validGoogleClassroom, id: '' };
    expect(() => GoogleClassroomSchema.parse(invalidEmpty)).toThrow();

    const invalidEmptyName = { ...validGoogleClassroom, name: '' };
    expect(() => GoogleClassroomSchema.parse(invalidEmptyName)).toThrow();
  });

  it('should reject invalid datetime strings', () => {
    const invalid = { ...validGoogleClassroom, creationTime: 'not-a-datetime' };
    expect(() => GoogleClassroomSchema.parse(invalid)).toThrow();
  });
});

describe('ClassroomSchema', () => {
  const validClassroom: Classroom = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'teacher@school.edu',
    courseId: 'course_123',
    courseName: 'AP Computer Science',
    ownerId: 'teacher_123',
    enrollmentCode: 'ABC123',
    room: 'Room 101',
    section: 'Period 1',
    descriptionHeading: 'Course Overview',
    description: 'Advanced placement computer science course',
    alternateLink: 'https://classroom.google.com/c/course_123',
    teacherGroupEmail: 'apcs-teachers@school.edu',
    courseState: 'ACTIVE',
    guardianInvitationsEnabled: true,
    creationTime: '2024-01-15T08:00:00.000Z',
    updateTime: '2024-01-16T10:30:00.000Z',
    lastSyncTime: 1705392000000,
  };

  it('should validate a complete valid classroom object', () => {
    expect(() => ClassroomSchema.parse(validClassroom)).not.toThrow();
  });

  it('should require valid UUID for id field', () => {
    const invalid = { ...validClassroom, id: 'not-a-uuid' };
    expect(() => ClassroomSchema.parse(invalid)).toThrow();
  });

  it('should require valid email for userId field', () => {
    const invalid = { ...validClassroom, userId: 'not-an-email' };
    expect(() => ClassroomSchema.parse(invalid)).toThrow();
  });

  it('should require positive integer for lastSyncTime', () => {
    const invalidNegative = { ...validClassroom, lastSyncTime: -1 };
    expect(() => ClassroomSchema.parse(invalidNegative)).toThrow();

    const invalidZero = { ...validClassroom, lastSyncTime: 0 };
    expect(() => ClassroomSchema.parse(invalidZero)).toThrow();

    const invalidFloat = { ...validClassroom, lastSyncTime: 123.45 };
    expect(() => ClassroomSchema.parse(invalidFloat)).toThrow();
  });

  it('should apply default values correctly', () => {
    const withoutDefaults = {
      ...validClassroom,
      guardianInvitationsEnabled: undefined,
    };
    const parsed = ClassroomSchema.parse(withoutDefaults);
    expect(parsed.guardianInvitationsEnabled).toBe(false);
  });
});

describe('ClassroomSyncSchema', () => {
  const validSync: ClassroomSync = {
    userId: 'teacher@school.edu',
    classrooms: [
      {
        id: 'course_123',
        name: 'Test Course',
        ownerId: 'teacher_123',
        courseState: 'ACTIVE',
      },
    ],
    syncTimestamp: 1705392000000,
    syncSource: 'google_classroom',
  };

  it('should validate a valid sync object', () => {
    expect(() => ClassroomSyncSchema.parse(validSync)).not.toThrow();
  });

  it('should require valid email for userId', () => {
    const invalid = { ...validSync, userId: 'not-an-email' };
    expect(() => ClassroomSyncSchema.parse(invalid)).toThrow();
  });

  it('should require literal value for syncSource', () => {
    const invalid = { ...validSync, syncSource: 'other_source' };
    expect(() => ClassroomSyncSchema.parse(invalid)).toThrow();
  });

  it('should validate nested classroom objects', () => {
    const invalidNested = {
      ...validSync,
      classrooms: [{ id: '', name: 'Test', ownerId: 'owner', courseState: 'ACTIVE' }],
    };
    expect(() => ClassroomSyncSchema.parse(invalidNested)).toThrow();
  });
});

describe('ClassroomMutationSchema', () => {
  it('should enforce length limits on string fields', () => {
    const base = {
      userId: 'teacher@school.edu',
      courseId: 'course_123',
      courseName: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE' as const,
    };

    // Test courseName length limit
    const longName = { ...base, courseName: 'x'.repeat(201) };
    expect(() => ClassroomMutationSchema.parse(longName)).toThrow();

    // Test room length limit
    const longRoom = { ...base, room: 'x'.repeat(101) };
    expect(() => ClassroomMutationSchema.parse(longRoom)).toThrow();

    // Test section length limit
    const longSection = { ...base, section: 'x'.repeat(101) };
    expect(() => ClassroomMutationSchema.parse(longSection)).toThrow();

    // Test descriptionHeading length limit
    const longHeading = { ...base, descriptionHeading: 'x'.repeat(501) };
    expect(() => ClassroomMutationSchema.parse(longHeading)).toThrow();

    // Test description length limit
    const longDescription = { ...base, description: 'x'.repeat(2001) };
    expect(() => ClassroomMutationSchema.parse(longDescription)).toThrow();
  });
});

describe('ClassroomQuerySchema', () => {
  it('should apply default values correctly', () => {
    const minimal = { userId: 'teacher@school.edu' };
    const parsed = ClassroomQuerySchema.parse(minimal);
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });

  it('should enforce limit maximum', () => {
    const overLimit = { userId: 'teacher@school.edu', limit: 101 };
    expect(() => ClassroomQuerySchema.parse(overLimit)).toThrow();
  });

  it('should reject negative offset', () => {
    const negativeOffset = { userId: 'teacher@school.edu', offset: -1 };
    expect(() => ClassroomQuerySchema.parse(negativeOffset)).toThrow();
  });
});

describe('ClassroomStatsSchema', () => {
  it('should enforce non-negative counts', () => {
    const base = {
      classroomId: '123e4567-e89b-12d3-a456-426614174000',
      totalAssignments: 5,
      totalSubmissions: 50,
      studentCount: 25,
    };

    const negativeAssignments = { ...base, totalAssignments: -1 };
    expect(() => ClassroomStatsSchema.parse(negativeAssignments)).toThrow();

    const negativeSubmissions = { ...base, totalSubmissions: -1 };
    expect(() => ClassroomStatsSchema.parse(negativeSubmissions)).toThrow();

    const negativeStudents = { ...base, studentCount: -1 };
    expect(() => ClassroomStatsSchema.parse(negativeStudents)).toThrow();
  });

  it('should enforce average score range', () => {
    const base = {
      classroomId: '123e4567-e89b-12d3-a456-426614174000',
      totalAssignments: 5,
      totalSubmissions: 50,
      studentCount: 25,
    };

    const scoreTooHigh = { ...base, averageScore: 101 };
    expect(() => ClassroomStatsSchema.parse(scoreTooHigh)).toThrow();

    const scoreTooLow = { ...base, averageScore: -1 };
    expect(() => ClassroomStatsSchema.parse(scoreTooLow)).toThrow();

    const validScore = { ...base, averageScore: 85.5 };
    expect(() => ClassroomStatsSchema.parse(validScore)).not.toThrow();
  });
});

describe('Validation Helper Functions', () => {
  it('should validateGoogleClassroom correctly', () => {
    const valid = {
      id: 'course_123',
      name: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
    };
    expect(() => validateGoogleClassroom(valid)).not.toThrow();
    expect(() => validateGoogleClassroom({})).toThrow();
  });

  it('should validateClassroom correctly', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'teacher@school.edu',
      courseId: 'course_123',
      courseName: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
      lastSyncTime: 1705392000000,
    };
    expect(() => validateClassroom(valid)).not.toThrow();
    expect(() => validateClassroom({})).toThrow();
  });

  it('should isValidClassroomMutation return boolean correctly', () => {
    const valid = {
      userId: 'teacher@school.edu',
      courseId: 'course_123',
      courseName: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
    };
    expect(isValidClassroomMutation(valid)).toBe(true);
    expect(isValidClassroomMutation({})).toBe(false);
    expect(isValidClassroomMutation(null)).toBe(false);
  });
});

describe('Schema Transformation Helpers', () => {
  it('should transform Google Classroom to internal format correctly', () => {
    const googleClassroom: GoogleClassroom = {
      id: 'course_123',
      name: 'AP Computer Science',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
      enrollmentCode: 'ABC123',
      section: 'Period 1',
      guardianInvitationsEnabled: true,
    };

    const userId = 'teacher@school.edu';
    const result = transformGoogleClassroomToInternal(googleClassroom, userId);

    expect(result.userId).toBe(userId);
    expect(result.courseId).toBe(googleClassroom.id);
    expect(result.courseName).toBe(googleClassroom.name);
    expect(result.ownerId).toBe(googleClassroom.ownerId);
    expect(result.courseState).toBe(googleClassroom.courseState);
    expect(result.enrollmentCode).toBe(googleClassroom.enrollmentCode);
    expect(result.section).toBe(googleClassroom.section);
    expect(result.guardianInvitationsEnabled).toBe(true);
    expect(typeof result.lastSyncTime).toBe('number');
    expect(result.lastSyncTime).toBeGreaterThan(0);
  });

  it('should handle undefined optional fields in transformation', () => {
    const googleClassroom: GoogleClassroom = {
      id: 'course_123',
      name: 'AP Computer Science',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
    };

    const userId = 'teacher@school.edu';
    const result = transformGoogleClassroomToInternal(googleClassroom, userId);

    expect(result.guardianInvitationsEnabled).toBe(false); // Default value
    expect(result.enrollmentCode).toBeUndefined();
    expect(result.section).toBeUndefined();
    expect(result.room).toBeUndefined();
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle null and undefined inputs gracefully', () => {
    expect(() => GoogleClassroomSchema.parse(null)).toThrow();
    expect(() => GoogleClassroomSchema.parse(undefined)).toThrow();
    expect(() => ClassroomSchema.parse(null)).toThrow();
    expect(() => ClassroomSchema.parse(undefined)).toThrow();
  });

  it('should handle malformed objects', () => {
    const malformed = {
      id: 123, // Should be string
      name: true, // Should be string
      ownerId: [], // Should be string
      courseState: 'INVALID', // Should be enum value
    };
    expect(() => GoogleClassroomSchema.parse(malformed)).toThrow();
  });

  it('should provide detailed error messages for validation failures', () => {
    try {
      GoogleClassroomSchema.parse({});
    } catch (error: any) {
      expect(error.message).toContain('id');
      expect(error.message).toContain('name');
      expect(error.message).toContain('ownerId');
      expect(error.message).toContain('courseState');
    }
  });
});