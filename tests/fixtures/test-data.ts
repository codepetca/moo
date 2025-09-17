import { z } from 'zod';

// Test data schemas for validation
export const TestClassroomSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseName: z.string(),
  ownerId: z.string(),
  courseState: z.string(),
  enrollmentCode: z.string().optional(),
  section: z.string().optional(),
  description: z.string().optional(),
});

export const TestAssignmentSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseWorkId: z.string(),
  formId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  state: z.string(),
  maxPoints: z.number().optional(),
  dueDate: z.string().optional(),
});

export const TestSubmissionSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
  studentId: z.string(),
  studentEmail: z.string(),
  studentName: z.string(),
  state: z.string(),
  submissionTime: z.number(),
  responses: z.array(z.object({
    questionId: z.string(),
    questionTitle: z.string(),
    questionType: z.string(),
    response: z.union([z.string(), z.array(z.string())]),
  })),
  score: z.number().optional(),
  totalPossible: z.number().optional(),
});

// Test data fixtures
export const mockClassrooms = [
  {
    id: 'classroom-1',
    courseId: 'course-123',
    courseName: 'AP Computer Science A',
    ownerId: 'teacher-1',
    courseState: 'ACTIVE',
    enrollmentCode: 'abc123',
    section: 'Period 3',
    description: 'Introduction to Java programming',
  },
  {
    id: 'classroom-2',
    courseId: 'course-456',
    courseName: 'Digital Marketing',
    ownerId: 'teacher-1',
    courseState: 'ACTIVE',
    enrollmentCode: 'xyz789',
    section: 'Period 5',
    description: 'Modern digital marketing strategies',
  },
] as const;

export const mockAssignments = [
  {
    id: 'assignment-1',
    courseId: 'course-123',
    courseWorkId: 'coursework-1',
    formId: 'form-1',
    title: 'Java Fundamentals Quiz',
    description: 'Basic concepts of Java programming',
    state: 'PUBLISHED',
    maxPoints: 100,
    dueDate: '2024-12-01T23:59:59Z',
  },
  {
    id: 'assignment-2',
    courseId: 'course-123',
    courseWorkId: 'coursework-2',
    formId: 'form-2',
    title: 'Object-Oriented Programming',
    description: 'Classes, objects, and inheritance',
    state: 'PUBLISHED',
    maxPoints: 150,
    dueDate: '2024-12-15T23:59:59Z',
  },
] as const;

export const mockSubmissions = [
  {
    id: 'submission-1',
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    studentEmail: 'alice@student.edu',
    studentName: 'Alice Johnson',
    state: 'TURNED_IN',
    submissionTime: Date.now() - 86400000, // 1 day ago
    responses: [
      {
        questionId: 'q1',
        questionTitle: 'What is a variable?',
        questionType: 'SHORT_ANSWER',
        response: 'A variable is a container that stores data values',
      },
      {
        questionId: 'q2',
        questionTitle: 'Which of these is a Java primitive type?',
        questionType: 'MULTIPLE_CHOICE',
        response: 'int',
      },
    ],
    score: 85,
    totalPossible: 100,
  },
  {
    id: 'submission-2',
    assignmentId: 'assignment-1',
    studentId: 'student-2',
    studentEmail: 'bob@student.edu',
    studentName: 'Bob Smith',
    state: 'TURNED_IN',
    submissionTime: Date.now() - 43200000, // 12 hours ago
    responses: [
      {
        questionId: 'q1',
        questionTitle: 'What is a variable?',
        questionType: 'SHORT_ANSWER',
        response: 'A variable stores data',
      },
      {
        questionId: 'q2',
        questionTitle: 'Which of these is a Java primitive type?',
        questionType: 'MULTIPLE_CHOICE',
        response: 'String',
      },
    ],
    score: 60,
    totalPossible: 100,
  },
] as const;

export const mockQuestions = [
  {
    questionId: 'q1',
    title: 'What is a variable in Java?',
    description: 'Explain the concept of variables',
    required: true,
    questionType: 'SHORT_ANSWER',
    points: 10,
    correctAnswer: 'A variable is a container that stores data values',
    caseSensitive: false,
    exactMatch: false,
  },
  {
    questionId: 'q2',
    title: 'Which of these is a Java primitive type?',
    description: 'Select the correct primitive type',
    required: true,
    questionType: 'MULTIPLE_CHOICE',
    choices: ['String', 'int', 'ArrayList', 'Scanner'],
    points: 5,
    correctAnswer: 'int',
  },
  {
    questionId: 'q3',
    title: 'Java is platform independent',
    description: 'True or false?',
    required: true,
    questionType: 'MULTIPLE_CHOICE',
    choices: ['True', 'False'],
    points: 5,
    correctAnswer: 'True',
  },
] as const;

// Helper functions for tests
export function createMockClassroom(overrides: Partial<typeof mockClassrooms[0]> = {}) {
  return { ...mockClassrooms[0], ...overrides };
}

export function createMockAssignment(overrides: Partial<typeof mockAssignments[0]> = {}) {
  return { ...mockAssignments[0], ...overrides };
}

export function createMockSubmission(overrides: Partial<typeof mockSubmissions[0]> = {}) {
  return { ...mockSubmissions[0], ...overrides };
}

// Validation helpers
export function validateTestData() {
  // Validate all test data against schemas
  mockClassrooms.forEach(classroom => {
    TestClassroomSchema.parse(classroom);
  });

  mockAssignments.forEach(assignment => {
    TestAssignmentSchema.parse(assignment);
  });

  mockSubmissions.forEach(submission => {
    TestSubmissionSchema.parse(submission);
  });

  console.log('✅ All test data validated successfully');
}

// Google API mock responses
export const mockGoogleClassroomResponse = {
  courses: [
    {
      id: 'course-123',
      name: 'AP Computer Science A',
      ownerId: 'teacher-1',
      courseState: 'ACTIVE',
      enrollmentCode: 'abc123',
      section: 'Period 3',
      description: 'Introduction to Java programming',
      alternateLink: 'https://classroom.google.com/c/course-123',
      creationTime: '2024-09-01T00:00:00Z',
      updateTime: '2024-09-01T00:00:00Z',
    },
  ],
};

export const mockGoogleFormsResponse = {
  formId: 'form-1',
  info: {
    title: 'Java Fundamentals Quiz',
    description: 'Basic concepts of Java programming',
  },
  items: [
    {
      itemId: 'q1',
      title: 'What is a variable in Java?',
      questionItem: {
        question: {
          required: true,
          textQuestion: {},
        },
      },
    },
    {
      itemId: 'q2',
      title: 'Which of these is a Java primitive type?',
      questionItem: {
        question: {
          required: true,
          choiceQuestion: {
            type: 'RADIO',
            options: [
              { value: 'String' },
              { value: 'int' },
              { value: 'ArrayList' },
              { value: 'Scanner' },
            ],
          },
        },
      },
    },
  ],
};