import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// RESULT PUBLISHING & DISTRIBUTION WORKFLOW
// ============================================

/**
 * Publication configuration and settings
 */
interface PublicationConfig {
  assignmentId: string;
  publishMode: "immediate" | "scheduled" | "manual";
  scheduledDate?: number;
  includeDetailedFeedback: boolean;
  includeGradingRubric: boolean;
  notificationSettings: {
    emailStudents: boolean;
    emailInstructors: boolean;
    classroomNotification: boolean;
    customMessage?: string;
  };
  privacySettings: {
    showIndividualScores: boolean;
    showClassStatistics: boolean;
    showPeerComparisons: boolean;
    anonymizeResults: boolean;
  };
}

/**
 * Publication status tracking
 */
interface PublicationStatus {
  assignmentId: string;
  status: "preparing" | "ready" | "publishing" | "published" | "failed";
  timestamp: number;
  studentsNotified: number;
  totalStudents: number;
  errors: string[];
  publicationUrl?: string;
}

/**
 * Individual student result package
 */
interface StudentResultPackage {
  studentId: string;
  studentEmail?: string;
  assignmentTitle: string;
  submissionDate: number;
  gradeDetails: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    letterGrade?: string;
    classRank?: number;
  };
  questionResults: Array<{
    questionId: string;
    questionText: string;
    studentResponse: any;
    pointsEarned: number;
    pointsPossible: number;
    feedback?: string;
    correctAnswer?: any;
  }>;
  overallFeedback: string;
  improvementSuggestions: string[];
  resourceRecommendations: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  classStatistics?: {
    classAverage: number;
    medianScore: number;
    yourPercentile: number;
  };
}

/**
 * Configure publication settings for an assignment
 */
export const configureResultPublication = mutation({
  args: {
    assignmentId: v.id("assignments"),
    config: v.object({
      publishMode: v.union(v.literal("immediate"), v.literal("scheduled"), v.literal("manual")),
      scheduledDate: v.optional(v.number()),
      includeDetailedFeedback: v.boolean(),
      includeGradingRubric: v.boolean(),
      notificationSettings: v.object({
        emailStudents: v.boolean(),
        emailInstructors: v.boolean(),
        classroomNotification: v.boolean(),
        customMessage: v.optional(v.string())
      }),
      privacySettings: v.object({
        showIndividualScores: v.boolean(),
        showClassStatistics: v.boolean(),
        showPeerComparisons: v.boolean(),
        anonymizeResults: v.boolean()
      })
    })
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Validate configuration
    if (args.config.publishMode === "scheduled" && !args.config.scheduledDate) {
      throw new Error("Scheduled date is required for scheduled publish mode");
    }

    if (args.config.scheduledDate && args.config.scheduledDate <= Date.now()) {
      throw new Error("Scheduled date must be in the future");
    }

    const publicationConfig: PublicationConfig = {
      assignmentId: args.assignmentId,
      ...args.config
    };

    // Store configuration
    await ctx.db.patch(args.assignmentId, {
      publicationConfig: publicationConfig as any
    });

    return {
      success: true,
      message: "Publication configuration saved",
      config: publicationConfig
    };
  }
});

/**
 * Prepare results for publication
 */
export const prepareResultsForPublication = query({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const publicationConfig = assignment.publicationConfig as PublicationConfig;
    if (!publicationConfig) {
      throw new Error("No publication configuration found");
    }

    // Get all submissions
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    // Calculate class statistics
    const gradedSubmissions = submissions.filter(sub => sub.score !== undefined);
    const scores = gradedSubmissions.map(sub => sub.score || 0);

    const classStats = {
      totalSubmissions: submissions.length,
      gradedSubmissions: gradedSubmissions.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      medianScore: scores.length > 0 ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)] : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      standardDeviation: 0 // Calculated below
    };

    // Calculate standard deviation
    if (scores.length > 0) {
      const variance = scores.reduce((acc, score) => acc + Math.pow(score - classStats.averageScore, 2), 0) / scores.length;
      classStats.standardDeviation = Math.sqrt(variance);
    }

    // Prepare student result packages
    const resultPackages: StudentResultPackage[] = [];

    for (const submission of gradedSubmissions) {
      try {
        // Get detailed grading results
        const gradingResults = submission.gradingResults as any || {};
        const questionResults = Array.isArray(gradingResults.questionResults)
          ? gradingResults.questionResults
          : [];

        // Calculate percentile
        const betterScores = scores.filter(score => score > (submission.score || 0)).length;
        const percentile = scores.length > 1
          ? Math.round(((scores.length - betterScores) / scores.length) * 100)
          : 100;

        // Generate improvement suggestions based on performance
        const improvementSuggestions = generateImprovementSuggestions(
          questionResults,
          submission.score || 0,
          submission.totalPossibleScore || 100
        );

        // Generate resource recommendations
        const resourceRecommendations = generateResourceRecommendations(
          questionResults,
          assignment.subject || "General"
        );

        const resultPackage: StudentResultPackage = {
          studentId: submission.studentId,
          studentEmail: submission.studentEmail,
          assignmentTitle: assignment.title,
          submissionDate: submission.submissionTime,
          gradeDetails: {
            totalScore: submission.score || 0,
            maxScore: submission.totalPossibleScore || 100,
            percentage: submission.percentage || 0,
            letterGrade: calculateLetterGrade(submission.percentage || 0),
            classRank: scores.filter(score => score > (submission.score || 0)).length + 1
          },
          questionResults: questionResults.map((qr: any) => ({
            questionId: qr.questionId,
            questionText: qr.questionText || `Question ${qr.questionId}`,
            studentResponse: qr.studentAnswer,
            pointsEarned: qr.score || 0,
            pointsPossible: qr.maxScore || 0,
            feedback: qr.feedback,
            correctAnswer: publicationConfig.includeGradingRubric ? qr.correctAnswer : undefined
          })),
          overallFeedback: Array.isArray(submission.feedback)
            ? submission.feedback.join("\n\n")
            : (submission.feedback || "Good work on this assignment!"),
          improvementSuggestions,
          resourceRecommendations,
          classStatistics: publicationConfig.privacySettings.showClassStatistics ? {
            classAverage: Math.round(classStats.averageScore * 100) / 100,
            medianScore: Math.round(classStats.medianScore * 100) / 100,
            yourPercentile: percentile
          } : undefined
        };

        resultPackages.push(resultPackage);

      } catch (error) {
        console.error(`Error preparing results for student ${submission.studentId}:`, error);
      }
    }

    return {
      assignment: {
        id: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate
      },
      publicationConfig,
      classStatistics: classStats,
      resultPackages,
      readyForPublication: resultPackages.length > 0,
      summary: {
        totalStudents: submissions.length,
        gradedStudents: gradedSubmissions.length,
        pendingGrades: submissions.length - gradedSubmissions.length,
        averageScore: Math.round(classStats.averageScore * 100) / 100,
        completionRate: submissions.length > 0 ? Math.round((gradedSubmissions.length / submissions.length) * 100) : 0
      }
    };
  }
});

/**
 * Publish results to students
 */
export const publishResults = action({
  args: {
    assignmentId: v.id("assignments"),
    testMode: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Get prepared results
    const resultsData = await ctx.runQuery(api.resultPublishing.prepareResultsForPublication, {
      assignmentId: args.assignmentId
    });

    if (!resultsData.readyForPublication) {
      return {
        success: false,
        message: "Results are not ready for publication",
        status: "failed"
      };
    }

    const publicationStatus: PublicationStatus = {
      assignmentId: args.assignmentId,
      status: "publishing",
      timestamp: Date.now(),
      studentsNotified: 0,
      totalStudents: resultsData.resultPackages.length,
      errors: []
    };

    // Update status to publishing
    await ctx.runMutation(api.resultPublishing.updatePublicationStatus, {
      assignmentId: args.assignmentId,
      status: publicationStatus
    });

    const notificationResults = [];

    // Process each student result
    for (const resultPackage of resultsData.resultPackages) {
      try {
        if (args.testMode) {
          // Simulate notification in test mode
          notificationResults.push({
            studentId: resultPackage.studentId,
            success: Math.random() > 0.05, // 95% success rate
            method: "email",
            timestamp: Date.now()
          });
        } else {
          // Real notification logic would go here
          // This would integrate with email services, Google Classroom notifications, etc.

          const notificationResult = await sendStudentNotification(
            resultPackage,
            resultsData.publicationConfig.notificationSettings
          );

          notificationResults.push({
            studentId: resultPackage.studentId,
            success: notificationResult.success,
            method: notificationResult.method,
            timestamp: Date.now(),
            error: notificationResult.error
          });
        }

        if (notificationResults[notificationResults.length - 1].success) {
          publicationStatus.studentsNotified++;
        }

      } catch (error) {
        const errorMessage = `Failed to notify student ${resultPackage.studentId}: ${error}`;
        publicationStatus.errors.push(errorMessage);

        notificationResults.push({
          studentId: resultPackage.studentId,
          success: false,
          method: "email",
          timestamp: Date.now(),
          error: errorMessage
        });
      }
    }

    // Update final status
    publicationStatus.status = publicationStatus.errors.length === 0 ? "published" : "failed";
    publicationStatus.publicationUrl = `https://classroom.google.com/c/${resultsData.publicationConfig.assignmentId}/grades`;

    await ctx.runMutation(api.resultPublishing.updatePublicationStatus, {
      assignmentId: args.assignmentId,
      status: publicationStatus
    });

    // Record detailed publication results
    await ctx.runMutation(api.resultPublishing.recordPublicationResults, {
      assignmentId: args.assignmentId,
      notificationResults,
      processingTime: Date.now() - startTime,
      testMode: args.testMode || false
    });

    const successRate = Math.round((publicationStatus.studentsNotified / publicationStatus.totalStudents) * 100);

    return {
      success: publicationStatus.status === "published",
      message: `Published results to ${publicationStatus.studentsNotified}/${publicationStatus.totalStudents} students (${successRate}%)`,
      status: publicationStatus.status,
      studentsNotified: publicationStatus.studentsNotified,
      errors: publicationStatus.errors,
      publicationUrl: publicationStatus.publicationUrl,
      processingTime: Date.now() - startTime
    };
  }
});

/**
 * Update publication status
 */
export const updatePublicationStatus = mutation({
  args: {
    assignmentId: v.id("assignments"),
    status: v.object({
      assignmentId: v.string(),
      status: v.union(
        v.literal("preparing"),
        v.literal("ready"),
        v.literal("publishing"),
        v.literal("published"),
        v.literal("failed")
      ),
      timestamp: v.number(),
      studentsNotified: v.number(),
      totalStudents: v.number(),
      errors: v.array(v.string()),
      publicationUrl: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, {
      publicationStatus: args.status
    });

    return args.status;
  }
});

/**
 * Record detailed publication results
 */
export const recordPublicationResults = mutation({
  args: {
    assignmentId: v.id("assignments"),
    notificationResults: v.array(v.object({
      studentId: v.string(),
      success: v.boolean(),
      method: v.string(),
      timestamp: v.number(),
      error: v.optional(v.string())
    })),
    processingTime: v.number(),
    testMode: v.boolean()
  },
  handler: async (ctx, args) => {
    const publicationRecord = await ctx.db.insert("publicationRecords", {
      assignmentId: args.assignmentId,
      timestamp: Date.now(),
      processingTime: args.processingTime,
      testMode: args.testMode,
      notificationResults: args.notificationResults,
      stats: {
        totalStudents: args.notificationResults.length,
        successful: args.notificationResults.filter(r => r.success).length,
        failed: args.notificationResults.filter(r => !r.success).length,
        successRate: args.notificationResults.length > 0
          ? Math.round((args.notificationResults.filter(r => r.success).length / args.notificationResults.length) * 100)
          : 0
      }
    });

    return publicationRecord;
  }
});

/**
 * Get publication history
 */
export const getPublicationHistory = query({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("publicationRecords")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .order("desc")
      .collect();

    return records.map(record => ({
      ...record,
      formattedTimestamp: new Date(record.timestamp).toISOString(),
      formattedDuration: `${record.processingTime}ms`
    }));
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate improvement suggestions based on performance
 */
function generateImprovementSuggestions(questionResults: any[], totalScore: number, maxScore: number): string[] {
  const suggestions: string[] = [];
  const percentage = (totalScore / maxScore) * 100;

  if (percentage < 60) {
    suggestions.push("Review the fundamental concepts covered in this assignment");
    suggestions.push("Consider attending office hours or tutoring sessions");
  } else if (percentage < 80) {
    suggestions.push("Focus on areas where points were lost");
    suggestions.push("Practice similar problems to strengthen understanding");
  } else if (percentage < 95) {
    suggestions.push("Review any questions that were marked incorrect");
    suggestions.push("Pay attention to detail in future assignments");
  }

  // Add specific suggestions based on question performance
  const poorPerformingQuestions = questionResults.filter(qr =>
    qr.maxScore > 0 && (qr.score / qr.maxScore) < 0.6
  );

  if (poorPerformingQuestions.length > 0) {
    suggestions.push(`Focus additional study on topics covered in questions: ${poorPerformingQuestions.map(q => q.questionId).join(', ')}`);
  }

  return suggestions;
}

/**
 * Generate resource recommendations based on performance
 */
function generateResourceRecommendations(questionResults: any[], subject: string): Array<{title: string, url: string, description: string}> {
  // This would normally be more sophisticated, pulling from a database of resources
  const baseRecommendations = [
    {
      title: `${subject} Study Guide`,
      url: `https://example.com/study-guide/${subject.toLowerCase()}`,
      description: `Comprehensive study materials for ${subject}`
    },
    {
      title: "Practice Problems",
      url: `https://example.com/practice/${subject.toLowerCase()}`,
      description: "Additional practice problems to reinforce learning"
    }
  ];

  return baseRecommendations;
}

/**
 * Calculate letter grade based on percentage
 */
function calculateLetterGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

/**
 * Send notification to student (placeholder for real implementation)
 */
async function sendStudentNotification(
  resultPackage: StudentResultPackage,
  notificationSettings: PublicationConfig['notificationSettings']
): Promise<{success: boolean, method: string, error?: string}> {
  // This would integrate with real email/notification services
  // For now, return a mock successful result
  return {
    success: true,
    method: notificationSettings.emailStudents ? "email" : "classroom"
  };
}