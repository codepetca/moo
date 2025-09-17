import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Enhanced schema with stricter validation following schema-first approach

export default defineSchema({
  // Legacy chat messages table - keeping for backwards compatibility
  messages: defineTable({
    user: v.string(),
    body: v.string(),
  }),

  // Autograding System Tables

  // Store classroom metadata with enhanced validation
  classrooms: defineTable({
    userId: v.string(), // Teacher's email/ID - validated as email in business logic
    courseId: v.string(), // Google Classroom course ID - unique identifier
    courseName: v.string(), // Course name - required, 1-200 chars
    ownerId: v.string(), // Course owner ID - required
    enrollmentCode: v.optional(v.string()), // Optional enrollment code
    room: v.optional(v.string()), // Optional room number/location
    section: v.optional(v.string()), // Optional section identifier
    descriptionHeading: v.optional(v.string()), // Optional description heading
    description: v.optional(v.string()), // Optional course description
    alternateLink: v.optional(v.string()), // Optional Google Classroom link
    teacherGroupEmail: v.optional(v.string()), // Optional teacher group email
    courseState: v.union( // Strict enum validation
      v.literal("ACTIVE"),
      v.literal("ARCHIVED"),
      v.literal("PROVISIONED"),
      v.literal("DECLINED"),
      v.literal("SUSPENDED")
    ),
    creationTime: v.optional(v.string()), // ISO datetime string
    updateTime: v.optional(v.string()), // ISO datetime string
    guardianInvitationsEnabled: v.optional(v.boolean()),
    lastSyncTime: v.number(), // Unix timestamp - required for sync tracking
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseId"])
    .index("by_user_course", ["userId", "courseId"]),

  // Store enhanced assignments with strict validation
  assignments: defineTable({
    userId: v.string(), // Teacher's email/ID - validated as email
    courseId: v.string(), // Associated classroom - foreign key
    courseWorkId: v.string(), // Google Classroom assignment ID - unique
    formId: v.string(), // Google Forms ID - required
    title: v.string(), // Assignment title - required, 1-500 chars
    description: v.optional(v.string()), // Optional description, max 2000 chars
    subject: v.optional(v.string()), // Optional subject, max 100 chars
    state: v.union( // Strict enum validation
      v.literal("PUBLISHED"),
      v.literal("DRAFT"),
      v.literal("DELETED")
    ),
    alternateLink: v.optional(v.string()), // Optional Google Classroom link
    creationTime: v.optional(v.string()), // ISO datetime string
    updateTime: v.optional(v.string()), // ISO datetime string
    dueDate: v.optional(v.string()), // ISO datetime string
    maxPoints: v.optional(v.number()), // Positive number
    workType: v.union( // Strict enum validation
      v.literal("ASSIGNMENT"),
      v.literal("SHORT_ANSWER_QUESTION"),
      v.literal("MULTIPLE_CHOICE_QUESTION")
    ),
    submissionModificationMode: v.optional(v.union(
      v.literal("MODIFIABLE_UNTIL_TURNED_IN"),
      v.literal("MODIFIABLE"),
      v.literal("NOT_MODIFIABLE")
    )),
    assigneeMode: v.optional(v.union(
      v.literal("ALL_STUDENTS"),
      v.literal("INDIVIDUAL_STUDENTS")
    )),
    creatorUserId: v.optional(v.string()),
    lastSyncTime: v.number(), // Unix timestamp - required
    // Enhanced functionality with structured data
    questions: v.optional(v.array(v.object({
      questionId: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      required: v.boolean(),
      questionType: v.union(
        v.literal("MULTIPLE_CHOICE"),
        v.literal("CHECKBOX"),
        v.literal("SHORT_ANSWER"),
        v.literal("PARAGRAPH"),
        v.literal("SCALE"),
        v.literal("GRID"),
        v.literal("DATE"),
        v.literal("TIME"),
        v.literal("FILE_UPLOAD")
      ),
      choices: v.optional(v.array(v.string())),
      correctAnswer: v.optional(v.string()),
      correctAnswers: v.optional(v.array(v.string())),
      points: v.number(),
      partialCredit: v.optional(v.boolean()),
      caseSensitive: v.optional(v.boolean()),
      exactMatch: v.optional(v.boolean()),
    }))),
    classroomSyncConfig: v.optional(v.object({
      syncGrades: v.boolean(),
      notifyStudents: v.boolean(),
      includeComments: v.boolean(),
      classroomId: v.string(),
      courseWorkId: v.string(),
      maxPoints: v.number(),
      syncMode: v.union(
        v.literal("manual"),
        v.literal("batch"),
        v.literal("immediate")
      ),
      dueDate: v.optional(v.string()),
    })),
    publicationConfig: v.optional(v.object({
      autoPublish: v.boolean(),
      publishDelay: v.number(),
    })),
    publicationStatus: v.optional(v.object({
      published: v.boolean(),
      publishedAt: v.optional(v.number()),
      publishedBy: v.optional(v.string()),
    })),
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
    feedbackConfig: v.optional(v.any()), // Feedback system configuration
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
    state: v.union( // Strict enum validation for submission states
      v.literal("NEW"),
      v.literal("CREATED"),
      v.literal("TURNED_IN"),
      v.literal("RETURNED"),
      v.literal("RECLAIMED_BY_STUDENT")
    ),
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
        state: v.union( // Strict enum validation
          v.literal("NEW"),
          v.literal("CREATED"),
          v.literal("TURNED_IN"),
          v.literal("RETURNED"),
          v.literal("RECLAIMED_BY_STUDENT")
        ),
        stateTimestamp: v.string(), // ISO datetime string
        actorUserId: v.optional(v.string()),
      }),
    }))),
    // Form response data with enhanced validation
    responses: v.array(
      v.object({
        questionId: v.string(), // Question identifier
        questionTitle: v.string(), // Question text
        questionType: v.union( // Strict enum validation
          v.literal("MULTIPLE_CHOICE"),
          v.literal("CHECKBOX"),
          v.literal("SHORT_ANSWER"),
          v.literal("PARAGRAPH"),
          v.literal("SCALE"),
          v.literal("GRID"),
          v.literal("DATE"),
          v.literal("TIME"),
          v.literal("FILE_UPLOAD")
        ),
        response: v.union(v.string(), v.array(v.string())), // Single or multiple responses
        textResponse: v.optional(v.string()),
        fileUploadAnswers: v.optional(v.array(v.string())), // File URLs if any
        // Grading fields
        isCorrect: v.optional(v.boolean()),
        pointsEarned: v.optional(v.number()),
        pointsPossible: v.optional(v.number()),
        feedback: v.optional(v.string()),
      })
    ),
    // Grading results with enhanced structure
    autoGraded: v.optional(v.boolean()),
    gradingResults: v.optional(v.array(v.object({
      questionId: v.string(),
      algorithm: v.optional(v.string()),
      confidence: v.optional(v.number()),
      feedback: v.optional(v.string()),
      isCorrect: v.boolean(),
      pointsEarned: v.number(),
      pointsPossible: v.number(),
    }))),
    score: v.optional(v.number()), // Current score
    totalScore: v.optional(v.number()),
    totalPossible: v.optional(v.number()),
    totalPossibleScore: v.optional(v.number()),
    percentage: v.optional(v.number()),
    percentageScore: v.optional(v.number()),
    gradingTimestamp: v.optional(v.number()),
    lastSyncTime: v.number(),
    // Pipeline status tracking with enhanced structure
    pipelineStatus: v.optional(v.object({
      stage: v.union(
        v.literal("received"),
        v.literal("processing"),
        v.literal("grading"),
        v.literal("completed"),
        v.literal("failed")
      ),
      progress: v.number(),
      startTime: v.number(),
      endTime: v.optional(v.number()),
      errors: v.optional(v.array(v.string())),
    })),
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
    generatedFeedback: v.optional(v.any()), // AI-generated feedback structure
    feedbackGeneratedAt: v.optional(v.number()), // Timestamp for feedback generation
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

  // Store user management with enhanced validation
  users: defineTable({
    email: v.string(), // Validated as email in business logic
    name: v.string(), // Required, 1-100 chars
    role: v.union(
      v.literal("teacher"),
      v.literal("student"),
      v.literal("admin")
    ),
    avatar: v.optional(v.string()), // URL string
    googleId: v.optional(v.string()),
    domain: v.optional(v.string()), // School domain
    schoolId: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActiveAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_domain", ["domain"])
    .index("by_school", ["schoolId"])
    .index("by_active", ["isActive"]),

  // Store enhanced user configurations and preferences
  userConfigs: defineTable({
    userId: v.string(), // References users table
    preferences: v.object({
      autoGradeOnSubmission: v.boolean(),
      sendGradesToClassroom: v.boolean(),
      notifyOnNewSubmissions: v.boolean(),
      defaultPartialCredit: v.boolean(),
      defaultCaseSensitive: v.boolean(),
      defaultExactMatch: v.boolean(),
      // Enhanced UI preferences
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      language: v.string(),
      timezone: v.string(),
      // Notification preferences
      emailNotifications: v.boolean(),
      pushNotifications: v.boolean(),
      weeklyDigest: v.boolean(),
      // Grading preferences
      defaultGradingMethod: v.union(
        v.literal("auto"),
        v.literal("manual"),
        v.literal("ai"),
        v.literal("hybrid")
      ),
      aiProvider: v.union(
        v.literal("gemini"),
        v.literal("claude"),
        v.literal("openai")
      ),
      showConfidenceScores: v.boolean(),
      requireReviewThreshold: v.number(),
    }),
    integrationSettings: v.object({
      googleClassroomEnabled: v.boolean(),
      googleFormsEnabled: v.boolean(),
      lastClassroomSync: v.optional(v.number()),
      lastFormsSync: v.optional(v.number()),
      // Webhook settings
      webhookUrl: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
      webhookEnabled: v.boolean(),
    }),
    lastActiveTime: v.number(),
    createdTime: v.number(),
    updatedTime: v.number(),
  })
    .index("by_user", ["userId"]),

  // Store grading sessions for analytics and debugging
  gradingSessions: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.string(),
    sessionType: v.union( // Strict enum validation
      v.literal("auto"),
      v.literal("manual"),
      v.literal("bulk"),
      v.literal("review"),
      v.literal("batch") // Added for batch grading
    ),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    submissionsProcessed: v.number(),
    submissionsGraded: v.number(),
    submissionsFailed: v.number(),
    errors: v.optional(v.array(v.string())),
    status: v.union( // Strict enum validation
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("pending") // Added for pending status
    ),
    // Additional fields for batch processing
    totalSubmissions: v.optional(v.number()),
    processedSubmissions: v.optional(v.number()),
    successfulSubmissions: v.optional(v.number()),
    failedSubmissions: v.optional(v.number()),
    batchJobData: v.optional(v.any()), // Flexible structure for batch job metadata
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_start_time", ["startTime"]),

  // Store batch grading jobs
  batchJobs: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.string(),
    status: v.union( // Strict enum validation
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
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
  })
    .index("by_operation", ["operationName"])
    .index("by_timestamp", ["timestamp"])
    .index("by_success", ["success"]),

  // Store user sessions for authentication
  sessions: defineTable({
    userId: v.string(), // References users table
    token: v.string(), // Session token
    expiresAt: v.number(), // Unix timestamp
    createdAt: v.number(),
    lastAccessedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"])
    .index("by_expires", ["expiresAt"])
    .index("by_active", ["isActive"]),

  // Store grading results for detailed tracking
  gradingResults: defineTable({
    submissionId: v.id("submissions"),
    questionId: v.string(),
    method: v.union(
      v.literal("auto"),
      v.literal("manual"),
      v.literal("ai"),
      v.literal("hybrid")
    ),
    pointsEarned: v.number(),
    pointsPossible: v.number(),
    percentage: v.number(),
    isCorrect: v.boolean(),
    confidence: v.optional(v.number()),
    feedback: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    suggestions: v.optional(v.array(v.string())),
    gradedAt: v.number(),
    gradedBy: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    needsReview: v.boolean(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_question", ["questionId"])
    .index("by_method", ["method"])
    .index("by_needs_review", ["needsReview"])
    .index("by_graded_at", ["gradedAt"]),

  // Store AI grading jobs and costs
  aiGradingJobs: defineTable({
    submissionId: v.id("submissions"),
    questionId: v.string(),
    provider: v.union(
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openai")
    ),
    model: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    tokensUsed: v.number(),
    cost: v.number(),
    processingTime: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_submission", ["submissionId"])
    .index("by_provider", ["provider"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

});