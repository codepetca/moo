import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Legacy chat messages table - keeping for backwards compatibility
  messages: defineTable({
    user: v.string(),
    body: v.string(),
  }),

  // Autograding System Tables

  // Store classroom metadata
  classrooms: defineTable({
    userId: v.string(), // Teacher's email/ID
    courseId: v.string(), // Google Classroom course ID
    courseName: v.string(),
    ownerId: v.string(), // Course owner ID
    enrollmentCode: v.optional(v.string()),
    room: v.optional(v.string()),
    section: v.optional(v.string()),
    descriptionHeading: v.optional(v.string()),
    description: v.optional(v.string()),
    alternateLink: v.optional(v.string()),
    teacherGroupEmail: v.optional(v.string()),
    courseState: v.string(), // ACTIVE, ARCHIVED, etc.
    creationTime: v.optional(v.string()),
    updateTime: v.optional(v.string()),
    guardianInvitationsEnabled: v.optional(v.boolean()),
    lastSyncTime: v.number(), // Timestamp of last sync with Google Classroom
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseId"])
    .index("by_user_course", ["userId", "courseId"]),

  // Store enhanced assignments with all new fields
  assignments: defineTable({
    userId: v.string(), // Teacher's email/ID
    courseId: v.string(), // Associated classroom
    courseWorkId: v.string(), // Google Classroom assignment ID
    formId: v.string(), // Google Forms ID
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    state: v.string(), // PUBLISHED, DRAFT, DELETED
    alternateLink: v.optional(v.string()),
    creationTime: v.optional(v.string()),
    updateTime: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    maxPoints: v.optional(v.number()),
    workType: v.string(), // ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION
    submissionModificationMode: v.optional(v.string()),
    assigneeMode: v.optional(v.string()),
    creatorUserId: v.optional(v.string()),
    lastSyncTime: v.number(),
    // New fields for enhanced functionality
    questions: v.optional(v.array(v.any())),
    classroomSyncConfig: v.optional(v.any()),
    publicationConfig: v.optional(v.any()),
    publicationStatus: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseId"])
    .index("by_coursework", ["courseWorkId"])
    .index("by_form", ["formId"])
    .index("by_user_course", ["userId", "courseId"]),

  // Store form structure and grading configuration
  gradingConfigs: defineTable({
    assignmentId: v.id("assignments"), // Reference to assignments table
    formId: v.string(),
    formTitle: v.string(),
    formDescription: v.optional(v.string()),
    totalPoints: v.number(),
    questions: v.array(
      v.object({
        questionId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        required: v.boolean(),
        questionType: v.string(), // MULTIPLE_CHOICE, CHECKBOX, SHORT_ANSWER, PARAGRAPH, etc.
        choices: v.optional(v.array(v.string())), // For multiple choice questions
        correctAnswer: v.optional(v.string()), // Correct answer for auto-grading
        correctAnswers: v.optional(v.array(v.string())), // For questions with multiple correct answers
        points: v.number(),
        partialCredit: v.optional(v.boolean()),
        caseSensitive: v.optional(v.boolean()),
        exactMatch: v.optional(v.boolean()),
      })
    ),
    autoGradingEnabled: v.boolean(),
    lastUpdated: v.number(),
    // Enhanced grading rules
    gradingRules: v.optional(v.array(v.any())),
    aiGradingConfig: v.optional(v.any()),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_form", ["formId"]),

  // Store student submissions and grades
  submissions: defineTable({
    assignmentId: v.id("assignments"),
    courseId: v.string(),
    courseWorkId: v.string(),
    formId: v.string(),
    studentId: v.string(), // Student's Google ID
    studentEmail: v.optional(v.string()),
    studentName: v.optional(v.string()),
    submissionId: v.string(), // Google Classroom submission ID
    state: v.string(), // NEW, CREATED, TURNED_IN, RETURNED, RECLAIMED_BY_STUDENT
    late: v.optional(v.boolean()),
    draftGrade: v.optional(v.number()),
    assignedGrade: v.optional(v.number()),
    alternateLink: v.optional(v.string()),
    courseWorkType: v.optional(v.string()),
    creationTime: v.optional(v.string()),
    updateTime: v.optional(v.string()),
    submissionTime: v.number(),
    submissionHistory: v.optional(v.array(v.object({
      stateHistory: v.object({
        state: v.string(),
        stateTimestamp: v.string(),
        actorUserId: v.optional(v.string()),
      }),
    }))),
    // Form response data
    responses: v.array(
      v.object({
        questionId: v.string(),
        questionTitle: v.string(),
        questionType: v.string(),
        response: v.union(v.string(), v.array(v.string())), // Single or multiple responses
        textResponse: v.optional(v.string()),
        fileUploadAnswers: v.optional(v.array(v.string())), // File URLs if any
      })
    ),
    // Grading results
    autoGraded: v.boolean(),
    gradingResults: v.optional(v.any()), // Flexible grading results structure
    score: v.optional(v.number()), // Current score
    totalScore: v.optional(v.number()),
    totalPossible: v.optional(v.number()),
    totalPossibleScore: v.optional(v.number()),
    percentage: v.optional(v.number()),
    percentageScore: v.optional(v.number()),
    gradingTimestamp: v.optional(v.number()),
    lastSyncTime: v.number(),
    // Pipeline status tracking
    pipelineStatus: v.optional(v.any()),
    validationErrors: v.optional(v.array(v.string())),
    validationWarnings: v.optional(v.array(v.string())),
    // Sync tracking
    lastSyncStatus: v.optional(v.object({
      success: v.boolean(),
      timestamp: v.number(),
      error: v.optional(v.string()),
      gradePosted: v.optional(v.number()),
      syncOperationId: v.optional(v.id("syncOperations")),
    })),
    // Feedback and AI grading
    feedback: v.optional(v.union(v.string(), v.array(v.string()))),
    aiGradingResults: v.optional(v.any()),
    requiresHumanReview: v.optional(v.boolean()),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_course", ["courseId"])
    .index("by_coursework", ["courseWorkId"])
    .index("by_form", ["formId"])
    .index("by_assignment_student", ["assignmentId", "studentId"])
    .index("by_course_student", ["courseId", "studentId"])
    .index("by_state", ["state"])
    .index("by_auto_graded", ["autoGraded"]),

  // Store system configuration and user preferences
  userConfigs: defineTable({
    userId: v.string(),
    preferences: v.object({
      autoGradeOnSubmission: v.boolean(),
      sendGradesToClassroom: v.boolean(),
      notifyOnNewSubmissions: v.boolean(),
      defaultPartialCredit: v.boolean(),
      defaultCaseSensitive: v.boolean(),
      defaultExactMatch: v.boolean(),
    }),
    integrationSettings: v.object({
      googleClassroomEnabled: v.boolean(),
      googleFormsEnabled: v.boolean(),
      lastClassroomSync: v.optional(v.number()),
      lastFormsSync: v.optional(v.number()),
    }),
    lastActiveTime: v.number(),
    createdTime: v.number(),
  })
    .index("by_user", ["userId"]),

  // Store grading sessions for analytics and debugging
  gradingSessions: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.string(),
    sessionType: v.string(), // AUTO, MANUAL, BULK
    startTime: v.number(),
    endTime: v.optional(v.number()),
    submissionsProcessed: v.number(),
    submissionsGraded: v.number(),
    submissionsFailed: v.number(),
    errors: v.optional(v.array(v.string())),
    status: v.string(), // RUNNING, COMPLETED, FAILED, CANCELLED
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_start_time", ["startTime"]),

  // Store batch grading jobs
  batchJobs: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.string(),
    status: v.string(), // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    settings: v.object({
      batchSize: v.number(),
      maxConcurrency: v.number(),
      skipAlreadyGraded: v.boolean(),
      retryFailedSubmissions: v.optional(v.boolean()),
      notifyOnCompletion: v.optional(v.boolean()),
    }),
    progress: v.object({
      totalSubmissions: v.number(),
      processedCount: v.number(),
      successCount: v.number(),
      failedCount: v.number(),
      currentBatch: v.number(),
      totalBatches: v.number(),
    }),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    estimatedCompletion: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
    results: v.optional(v.array(v.any())),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Store classroom sync operations
  syncOperations: defineTable({
    assignmentId: v.id("assignments"),
    operationType: v.string(), // grade_sync, result_publish, etc.
    timestamp: v.number(),
    processingTime: v.number(),
    testMode: v.boolean(),
    results: v.array(v.any()),
    stats: v.object({
      totalProcessed: v.number(),
      successful: v.number(),
      failed: v.number(),
    }),
  })
    .index("by_assignment", ["assignmentId"]),

  // Store publication records
  publicationRecords: defineTable({
    assignmentId: v.id("assignments"),
    timestamp: v.number(),
    processingTime: v.number(),
    testMode: v.boolean(),
    notificationResults: v.array(v.any()),
    stats: v.object({
      totalStudents: v.number(),
      successful: v.number(),
      failed: v.number(),
      successRate: v.number(),
    }),
  })
    .index("by_assignment", ["assignmentId"]),

  // Store operation logs for error handling and monitoring
  operationLogs: defineTable({
    operationId: v.string(),
    operationName: v.string(),
    timestamp: v.number(),
    success: v.boolean(),
    attempts: v.array(v.any()),
    finalError: v.optional(v.any()),
    totalTime: v.number(),
    stats: v.object({
      totalAttempts: v.number(),
      totalRetries: v.number(),
      avgResponseTime: v.number(),
      totalRetryDelay: v.number(),
    }),
  }),

});