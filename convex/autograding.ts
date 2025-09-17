import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// CLASSROOM MANAGEMENT FUNCTIONS
// ============================================

/**
 * Save classroom data from Google Classroom API
 */
export const saveClassroomData = mutation({
  args: {
    userId: v.string(),
    courseId: v.string(),
    courseName: v.string(),
    ownerId: v.string(),
    enrollmentCode: v.optional(v.string()),
    room: v.optional(v.string()),
    section: v.optional(v.string()),
    descriptionHeading: v.optional(v.string()),
    description: v.optional(v.string()),
    alternateLink: v.optional(v.string()),
    teacherGroupEmail: v.optional(v.string()),
    courseState: v.union(
      v.literal("ACTIVE"),
      v.literal("ARCHIVED"),
      v.literal("PROVISIONED"),
      v.literal("DECLINED"),
      v.literal("SUSPENDED")
    ),
    creationTime: v.optional(v.string()),
    updateTime: v.optional(v.string()),
    guardianInvitationsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if classroom already exists
    const existing = await ctx.db
      .query("classrooms")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .first();

    const classroomData = {
      ...args,
      lastSyncTime: Date.now(),
    };

    if (existing) {
      // Update existing classroom
      await ctx.db.patch(existing._id, classroomData);
      return { success: true, action: "updated", classroomId: existing._id };
    } else {
      // Create new classroom
      const classroomId = await ctx.db.insert("classrooms", classroomData);
      return { success: true, action: "created", classroomId };
    }
  },
});

/**
 * Get classrooms for a specific user
 */
export const getClassrooms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classrooms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("courseState"), "ACTIVE"))
      .collect();
  },
});

/**
 * Get a specific classroom by courseId
 */
export const getClassroom = query({
  args: {
    userId: v.string(),
    courseId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classrooms")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .first();
  },
});

// ============================================
// ASSIGNMENT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Save assignment data from Google Classroom API
 */
export const saveAssignmentData = mutation({
  args: {
    userId: v.string(),
    courseId: v.string(),
    courseWorkId: v.string(),
    formId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    state: v.union(
      v.literal("PUBLISHED"),
      v.literal("DRAFT"),
      v.literal("DELETED")
    ),
    alternateLink: v.optional(v.string()),
    creationTime: v.optional(v.string()),
    updateTime: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    maxPoints: v.optional(v.number()),
    workType: v.union(
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
  },
  handler: async (ctx, args) => {
    // Check if assignment already exists
    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_coursework", (q) => q.eq("courseWorkId", args.courseWorkId))
      .first();

    const assignmentData = {
      ...args,
      lastSyncTime: Date.now(),
    };

    if (existing) {
      // Update existing assignment
      await ctx.db.patch(existing._id, assignmentData);
      return { success: true, action: "updated", assignmentId: existing._id };
    } else {
      // Create new assignment
      const assignmentId = await ctx.db.insert("assignments", assignmentData);
      return { success: true, action: "created", assignmentId };
    }
  },
});

/**
 * Get assignments for a specific classroom
 */
export const getAssignments = query({
  args: {
    userId: v.string(),
    courseId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .filter((q) => q.neq(q.field("state"), "DELETED"))
      .collect();
  },
});

/**
 * Get a specific assignment by courseWorkId
 */
export const getAssignment = query({
  args: { courseWorkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_coursework", (q) => q.eq("courseWorkId", args.courseWorkId))
      .first();
  },
});

// ============================================
// GRADING CONFIGURATION FUNCTIONS
// ============================================

/**
 * Save grading configuration for a form
 */
export const saveGradingConfig = mutation({
  args: {
    assignmentId: v.id("assignments"),
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
        questionType: v.string(),
        choices: v.optional(v.array(v.string())),
        correctAnswer: v.optional(v.string()),
        correctAnswers: v.optional(v.array(v.string())),
        points: v.number(),
        partialCredit: v.optional(v.boolean()),
        caseSensitive: v.optional(v.boolean()),
        exactMatch: v.optional(v.boolean()),
      })
    ),
    autoGradingEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if grading config already exists
    const existing = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .first();

    const configData = {
      ...args,
      lastUpdated: Date.now(),
    };

    if (existing) {
      // Update existing config
      await ctx.db.patch(existing._id, configData);
      return { success: true, action: "updated", configId: existing._id };
    } else {
      // Create new config
      const configId = await ctx.db.insert("gradingConfigs", configData);
      return { success: true, action: "created", configId };
    }
  },
});

/**
 * Get grading configuration for an assignment
 */
export const getGradingConfig = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .first();
  },
});

// ============================================
// USER CONFIGURATION FUNCTIONS
// ============================================

/**
 * Save user preferences and settings
 */
export const saveUserConfig = mutation({
  args: {
    userId: v.string(),
    preferences: v.object({
      autoGradeOnSubmission: v.boolean(),
      sendGradesToClassroom: v.boolean(),
      notifyOnNewSubmissions: v.boolean(),
      defaultPartialCredit: v.boolean(),
      defaultCaseSensitive: v.boolean(),
      defaultExactMatch: v.boolean(),
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      language: v.string(),
      timezone: v.string(),
      emailNotifications: v.boolean(),
      pushNotifications: v.boolean(),
      weeklyDigest: v.boolean(),
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
      webhookUrl: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
      webhookEnabled: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if user config already exists
    const existing = await ctx.db
      .query("userConfigs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing config
      await ctx.db.patch(existing._id, {
        preferences: args.preferences,
        integrationSettings: args.integrationSettings,
        lastActiveTime: Date.now(),
        updatedTime: Date.now(),
      });
      return { success: true, action: "updated", configId: existing._id };
    } else {
      // Create new config
      const configId = await ctx.db.insert("userConfigs", {
        userId: args.userId,
        preferences: args.preferences,
        integrationSettings: args.integrationSettings,
        lastActiveTime: Date.now(),
        createdTime: Date.now(),
        updatedTime: Date.now(),
      });
      return { success: true, action: "created", configId };
    }
  },
});

/**
 * Get user configuration
 */
export const getUserConfig = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("userConfigs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Return default config if none exists
    if (!config) {
      return {
        userId: args.userId,
        preferences: {
          autoGradeOnSubmission: true,
          sendGradesToClassroom: true,
          notifyOnNewSubmissions: true,
          defaultPartialCredit: false,
          defaultCaseSensitive: false,
          defaultExactMatch: true,
        },
        integrationSettings: {
          googleClassroomEnabled: true,
          googleFormsEnabled: true,
        },
        lastActiveTime: Date.now(),
        createdTime: Date.now(),
      };
    }

    return config;
  },
});

// ============================================
// BULK DATA IMPORT FUNCTIONS
// ============================================

/**
 * Process structured data from Apps Script webapp
 * This is the main endpoint that Apps Script will call
 */
export const processClassroomFormData = mutation({
  args: {
    userId: v.string(),
    courseId: v.string(),
    courseName: v.string(),
    courseWorkId: v.string(),
    assignmentTitle: v.string(),
    formId: v.string(),
    formTitle: v.string(),
    questions: v.array(
      v.object({
        questionId: v.string(),
        title: v.string(),
        type: v.string(),
        choices: v.optional(v.array(v.string())),
        correctAnswer: v.optional(v.string()),
        points: v.number(),
      })
    ),
    totalPoints: v.number(),
    dueDate: v.optional(v.string()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Save/update classroom data
      const classroomResult = await ctx.db.insert("classrooms", {
        userId: args.userId,
        courseId: args.courseId,
        courseName: args.courseName,
        ownerId: args.userId,
        courseState: "ACTIVE",
        lastSyncTime: Date.now(),
      });

      // 2. Save/update assignment data
      const assignmentResult = await ctx.db.insert("assignments", {
        userId: args.userId,
        courseId: args.courseId,
        courseWorkId: args.courseWorkId,
        formId: args.formId,
        title: args.assignmentTitle,
        state: "PUBLISHED",
        dueDate: args.dueDate,
        maxPoints: args.totalPoints,
        workType: "ASSIGNMENT",
        lastSyncTime: Date.now(),
      });

      // 3. Save grading configuration
      const gradingQuestions = args.questions.map(q => ({
        questionId: q.questionId,
        title: q.title,
        description: "",
        required: true,
        questionType: q.type,
        choices: q.choices,
        correctAnswer: q.correctAnswer,
        points: q.points,
        partialCredit: false,
        caseSensitive: false,
        exactMatch: true,
      }));

      const configResult = await ctx.db.insert("gradingConfigs", {
        assignmentId: assignmentResult,
        formId: args.formId,
        formTitle: args.formTitle,
        totalPoints: args.totalPoints,
        questions: gradingQuestions,
        autoGradingEnabled: true,
        lastUpdated: Date.now(),
      });

      return {
        success: true,
        data: {
          classroomId: classroomResult,
          assignmentId: assignmentResult,
          configId: configResult,
        },
        message: `Successfully processed data for ${args.courseName} - ${args.assignmentTitle}`,
      };

    } catch (error) {
      console.error("Error processing classroom form data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Failed to process classroom form data",
      };
    }
  },
});

// ============================================
// DASHBOARD QUERY FUNCTIONS
// ============================================

/**
 * Get dashboard summary data for a user
 */
export const getDashboardSummary = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const classrooms = await ctx.db
      .query("classrooms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("courseState"), "ACTIVE"))
      .collect();

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("state"), "DELETED"))
      .collect();

    const submissions = await ctx.db
      .query("submissions")
      .collect(); // TODO: Add proper filtering

    return {
      totalClassrooms: classrooms.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      recentClassrooms: classrooms.slice(0, 5),
      recentAssignments: assignments.slice(0, 5),
    };
  },
});

/**
 * Get detailed classroom data with assignments
 */
export const getClassroomDetails = query({
  args: {
    userId: v.string(),
    courseId: v.string()
  },
  handler: async (ctx, args) => {
    const classroom = await ctx.db
      .query("classrooms")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .first();

    if (!classroom) {
      return null;
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    return {
      classroom,
      assignments,
      assignmentCount: assignments.length,
    };
  },
});

// ============================================
// SUBMISSION MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get all submissions for a specific assignment
 */
export const getSubmissions = query({
  args: {
    assignmentId: v.id("assignments"),
    courseId: v.string(),
  },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    // Filter by courseId for additional security
    return submissions.filter(submission => submission.courseId === args.courseId);
  },
});

/**
 * Get detailed information for a specific submission
 */
export const getSubmissionDetails = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});

/**
 * Save submission data from Google Classroom API
 */
export const saveSubmissionData = mutation({
  args: {
    assignmentId: v.id("assignments"),
    courseId: v.string(),
    courseWorkId: v.string(),
    formId: v.string(),
    studentId: v.string(),
    studentEmail: v.optional(v.string()),
    submissionId: v.string(), // Google Classroom submission ID
    state: v.union(
      v.literal("NEW"),
      v.literal("CREATED"),
      v.literal("TURNED_IN"),
      v.literal("RETURNED"),
      v.literal("RECLAIMED_BY_STUDENT")
    ),
    responses: v.array(v.object({
      questionId: v.string(),
      questionTitle: v.string(),
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
      response: v.union(v.string(), v.array(v.string())),
      textResponse: v.optional(v.string()),
      fileUploadAnswers: v.optional(v.array(v.string())),
    })),
    totalScore: v.optional(v.number()),
    totalPossible: v.optional(v.number()),
    autoGraded: v.optional(v.boolean()),
    gradingTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if submission already exists
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", args.studentId)
      )
      .first();

    const submissionData = {
      ...args,
      autoGraded: args.autoGraded || false,
      lastSyncTime: Date.now(),
      submissionTime: Date.now(), // Add required submissionTime field
    };

    if (existing) {
      // Update existing submission
      await ctx.db.patch(existing._id, submissionData);
      return { success: true, action: "updated", submissionId: existing._id };
    } else {
      // Create new submission
      const newSubmissionId = await ctx.db.insert("submissions", submissionData);
      return { success: true, action: "created", submissionId: newSubmissionId };
    }
  },
});

/**
 * Auto-grade a submission
 */
export const autoGradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Get grading configuration for this assignment
    const gradingConfig = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", submission.assignmentId))
      .first();

    if (!gradingConfig || !gradingConfig.autoGradingEnabled) {
      throw new Error("Auto-grading not enabled for this assignment");
    }

    // Calculate score based on responses and correct answers
    let totalScore = 0;
    const gradingResults = submission.responses.map(response => {
      const question = gradingConfig.questions.find(q => q.questionId === response.questionId);
      if (!question) {
        return {
          questionId: response.questionId,
          isCorrect: false,
          pointsEarned: 0,
          pointsPossible: 0,
          feedback: "Question not found in grading configuration",
        };
      }

      let isCorrect = false;
      let pointsEarned = 0;
      let feedback = "";

      // Grade based on question type
      if (question.questionType === "MULTIPLE_CHOICE" || question.questionType === "CHECKBOX") {
        const responseText = Array.isArray(response.response) ? response.response[0] : response.response;
        if (responseText === question.correctAnswer) {
          isCorrect = true;
          pointsEarned = question.points;
          feedback = "Correct!";
        } else {
          isCorrect = false;
          pointsEarned = 0;
          feedback = `Incorrect. The correct answer is: ${question.correctAnswer}`;
        }
      } else if (question.questionType === "SHORT_ANSWER") {
        // For now, award full points to short answers (would need AI grading for better scoring)
        isCorrect = true;
        pointsEarned = question.points;
        feedback = "Response recorded";
      }

      totalScore += pointsEarned;
      return {
        questionId: response.questionId,
        isCorrect,
        pointsEarned,
        pointsPossible: question.points,
        feedback,
      };
    });

    // Update submission with grading results
    await ctx.db.patch(args.submissionId, {
      gradingResults,
      totalScore,
      totalPossible: gradingConfig.totalPoints,
      percentageScore: Math.round((totalScore / gradingConfig.totalPoints) * 100),
      autoGraded: true,
      gradingTimestamp: Date.now(),
    });

    return {
      success: true,
      totalScore,
      totalPossible: gradingConfig.totalPoints,
      percentage: Math.round((totalScore / gradingConfig.totalPoints) * 100),
    };
  },
});

/**
 * Get grading statistics for an assignment
 */
export const getGradingStats = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.autoGraded).length;
    const scores = submissions.filter(s => s.totalScore !== undefined).map(s => s.totalScore!);

    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      totalSubmissions,
      gradedSubmissions,
      ungradedSubmissions: totalSubmissions - gradedSubmissions,
      averageScore: Math.round(averageScore * 100) / 100,
      maxScore,
      minScore,
      gradingProgress: totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0,
    };
  },
});

/**
 * Get grading session details
 */
export const getGradingSession = query({
  args: {
    sessionId: v.id("gradingSessions")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});