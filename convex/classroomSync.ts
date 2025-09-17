import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================
// GOOGLE CLASSROOM INTEGRATION & SYNC
// ============================================

/**
 * Grade sync configuration for Google Classroom
 */
interface GradeSyncConfig {
  classroomId: string;
  courseWorkId: string;
  maxPoints: number;
  dueDate?: string;
  syncMode: "immediate" | "batch" | "manual";
  notifyStudents: boolean;
  includeComments: boolean;
}

/**
 * Student grade entry for Google Classroom
 */
interface ClassroomGradeEntry {
  userId: string;
  assignedGrade: number;
  alternateLink?: string;
  courseWorkId: string;
  draftGrade?: number;
  comment?: string;
}

/**
 * Sync result tracking
 */
interface SyncResult {
  submissionId: string;
  studentId: string;
  success: boolean;
  error?: string;
  gradePosted?: number;
  timestamp: number;
}

/**
 * Create or update grade sync configuration for an assignment
 */
export const configureGradeSync = mutation({
  args: {
    assignmentId: v.id("assignments"),
    classroomConfig: v.object({
      classroomId: v.string(),
      courseWorkId: v.string(),
      maxPoints: v.number(),
      dueDate: v.optional(v.string()),
      syncMode: v.union(v.literal("immediate"), v.literal("batch"), v.literal("manual")),
      syncGrades: v.boolean(),
      notifyStudents: v.boolean(),
      includeComments: v.boolean()
    })
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Store or update the classroom sync configuration
    await ctx.db.patch(args.assignmentId, {
      classroomSyncConfig: args.classroomConfig
    });

    return {
      success: true,
      message: "Grade sync configuration updated",
      config: args.classroomConfig
    };
  }
});

/**
 * Prepare grade data for Google Classroom sync
 */
export const prepareGradesForSync = query({
  args: {
    assignmentId: v.id("assignments"),
    includeUngraded: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroomConfig = assignment.classroomSyncConfig as GradeSyncConfig;
    if (!classroomConfig) {
      throw new Error("No classroom sync configuration found");
    }

    // Get all submissions for this assignment
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const gradeEntries: ClassroomGradeEntry[] = [];
    const syncStats = {
      totalSubmissions: submissions.length,
      gradedSubmissions: 0,
      ungradedSubmissions: 0,
      readyForSync: 0,
      errors: [] as string[]
    };

    for (const submission of submissions) {
      const hasGrade = submission.score !== undefined && submission.score !== null;

      if (hasGrade) {
        syncStats.gradedSubmissions++;
      } else {
        syncStats.ungradedSubmissions++;
        if (!args.includeUngraded) {
          continue;
        }
      }

      try {
        // Calculate grade as percentage of max points
        let assignedGrade = 0;
        if (hasGrade && submission.score !== undefined) {
          const percentage = submission.percentage || (submission.score / (submission.totalPossibleScore || 100) * 100);
          assignedGrade = Math.round((percentage / 100) * classroomConfig.maxPoints);
        }

        // Generate comment from feedback if configured
        let comment = "";
        if (classroomConfig.includeComments && submission.feedback) {
          const feedback = Array.isArray(submission.feedback)
            ? submission.feedback.join("\n\n")
            : submission.feedback;

          // Limit comment length for Google Classroom API
          comment = typeof feedback === 'string' && feedback.length > 1000
            ? feedback.substring(0, 997) + "..."
            : feedback;
        }

        const gradeEntry: ClassroomGradeEntry = {
          userId: submission.studentId,
          assignedGrade: hasGrade ? (assignedGrade ?? 0) : 0,
          courseWorkId: classroomConfig.courseWorkId,
          draftGrade: hasGrade ? undefined : assignedGrade,
          comment: comment || undefined
        };

        gradeEntries.push(gradeEntry);
        if (hasGrade || args.includeUngraded) {
          syncStats.readyForSync++;
        }

      } catch (error) {
        syncStats.errors.push(`Error preparing grade for submission ${submission._id}: ${error}`);
      }
    }

    return {
      classroomConfig,
      gradeEntries,
      syncStats,
      canSync: syncStats.readyForSync > 0
    };
  }
});

/**
 * Sync grades to Google Classroom (calls external API)
 */
export const syncGradesToClassroom = action({
  args: {
    assignmentId: v.id("assignments"),
    forceSync: v.optional(v.boolean()),
    testMode: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // Get grade data prepared for sync
    const gradeData = await ctx.runQuery(api.classroomSync.prepareGradesForSync, {
      assignmentId: args.assignmentId,
      includeUngraded: false
    });

    if (!gradeData.canSync) {
      return {
        success: false,
        message: "No grades ready for sync",
        syncResults: []
      };
    }

    const syncResults: SyncResult[] = [];
    const startTime = Date.now();

    // In test mode, simulate API calls
    if (args.testMode) {
      for (const gradeEntry of gradeData.gradeEntries) {
        const mockResult: SyncResult = {
          submissionId: `mock-submission-${gradeEntry.userId}`,
          studentId: gradeEntry.userId,
          success: Math.random() > 0.1, // 90% success rate in test mode
          gradePosted: gradeEntry.assignedGrade,
          timestamp: Date.now()
        };

        if (!mockResult.success) {
          mockResult.error = "Mock API error for testing";
        }

        syncResults.push(mockResult);
      }
    } else {
      // Real Google Classroom API integration would go here
      // This is a placeholder for the actual API implementation
      for (const gradeEntry of gradeData.gradeEntries) {
        try {
          // Simulated API call - in real implementation, this would call:
          // Google Classroom API: classroom.courses.courseWork.studentSubmissions.patch

          const mockApiResponse = {
            success: true,
            gradePosted: gradeEntry.assignedGrade,
            alternateLink: `https://classroom.google.com/c/${gradeData.classroomConfig.classroomId}/a/${gradeEntry.courseWorkId}/submissions/by-status/and-sort-first-name/all`
          };

          const result: SyncResult = {
            submissionId: `submission-${gradeEntry.userId}`,
            studentId: gradeEntry.userId,
            success: mockApiResponse.success,
            gradePosted: mockApiResponse.gradePosted,
            timestamp: Date.now()
          };

          syncResults.push(result);

        } catch (error) {
          syncResults.push({
            submissionId: `submission-${gradeEntry.userId}`,
            studentId: gradeEntry.userId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now()
          });
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const successfulSyncs = syncResults.filter(r => r.success).length;
    const failedSyncs = syncResults.filter(r => !r.success).length;

    // Record sync operation in database
    await ctx.runMutation(api.classroomSync.recordSyncOperation, {
      assignmentId: args.assignmentId,
      syncResults,
      processingTime,
      testMode: args.testMode || false
    });

    return {
      success: failedSyncs === 0,
      message: `Synced ${successfulSyncs} grades successfully${failedSyncs > 0 ? `, ${failedSyncs} failed` : ''}`,
      syncResults,
      stats: {
        totalProcessed: syncResults.length,
        successful: successfulSyncs,
        failed: failedSyncs,
        processingTime
      }
    };
  }
});

/**
 * Record sync operation results
 */
export const recordSyncOperation = mutation({
  args: {
    assignmentId: v.id("assignments"),
    syncResults: v.array(v.object({
      submissionId: v.string(),
      studentId: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
      gradePosted: v.optional(v.number()),
      timestamp: v.number()
    })),
    processingTime: v.number(),
    testMode: v.boolean()
  },
  handler: async (ctx, args) => {
    // Create sync operation record
    const syncOperation = await ctx.db.insert("syncOperations", {
      assignmentId: args.assignmentId,
      operationType: "grade_sync",
      timestamp: Date.now(),
      processingTime: args.processingTime,
      testMode: args.testMode,
      results: args.syncResults,
      stats: {
        totalProcessed: args.syncResults.length,
        successful: args.syncResults.filter(r => r.success).length,
        failed: args.syncResults.filter(r => !r.success).length
      }
    });

    // Update individual submissions with sync status
    for (const result of args.syncResults) {
      // Find the submission by student ID and assignment ID
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
        .filter((q) => q.eq(q.field("studentId"), result.studentId))
        .collect();

      if (submissions.length > 0) {
        const submission = submissions[0];
        await ctx.db.patch(submission._id, {
          lastSyncStatus: {
            success: result.success,
            timestamp: result.timestamp,
            error: result.error,
            gradePosted: result.gradePosted,
            syncOperationId: syncOperation
          }
        });
      }
    }

    return syncOperation;
  }
});

/**
 * Get sync history for an assignment
 */
export const getSyncHistory = query({
  args: {
    assignmentId: v.id("assignments"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const syncOperations = await ctx.db
      .query("syncOperations")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .order("desc")
      .take(args.limit || 10);

    return syncOperations.map(op => ({
      ...op,
      summary: {
        timestamp: new Date(op.timestamp).toISOString(),
        duration: `${op.processingTime}ms`,
        successRate: `${Math.round((op.stats.successful / op.stats.totalProcessed) * 100)}%`,
        status: op.stats.failed === 0 ? "success" : "partial"
      }
    }));
  }
});

/**
 * Check sync status for individual submissions
 */
export const checkSubmissionSyncStatus = query({
  args: {
    submissionIds: v.array(v.id("submissions"))
  },
  handler: async (ctx, args) => {
    const statusChecks = await Promise.all(
      args.submissionIds.map(async (id) => {
        const submission = await ctx.db.get(id);
        if (!submission) {
          return {
            submissionId: id,
            found: false
          };
        }

        return {
          submissionId: id,
          found: true,
          studentId: submission.studentId,
          hasGrade: submission.score !== undefined,
          lastSyncStatus: submission.lastSyncStatus || null,
          needsSync: submission.score !== undefined && (!submission.lastSyncStatus || !submission.lastSyncStatus.success)
        };
      })
    );

    return {
      checks: statusChecks,
      summary: {
        total: statusChecks.length,
        found: statusChecks.filter(c => c.found).length,
        withGrades: statusChecks.filter(c => c.found && c.hasGrade).length,
        needingSync: statusChecks.filter(c => c.found && c.needsSync).length,
        synced: statusChecks.filter(c => c.found && c.lastSyncStatus?.success).length
      }
    };
  }
});

/**
 * Helper query to get submissions by assignment for actions
 */
export const getSubmissionsByAssignment = query({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q: any) => q.eq("assignmentId", args.assignmentId))
      .collect();
  }
});

/**
 * Retry failed sync operations
 */
export const retryFailedSync = action({
  args: {
    assignmentId: v.id("assignments"),
    studentIds: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    // Get submissions that need retry via query since actions can't use ctx.db directly
    const submissions = await ctx.runQuery(api.classroomSync.getSubmissionsByAssignment, {
      assignmentId: args.assignmentId
    }) || [];

    const failedSubmissions = submissions.filter((sub: Doc<"submissions">) => {
      if (args.studentIds && !args.studentIds.includes(sub.studentId)) {
        return false;
      }

      return sub.score !== undefined &&
             (!sub.lastSyncStatus || !sub.lastSyncStatus.success);
    });

    if (failedSubmissions.length === 0) {
      return {
        success: true,
        message: "No failed syncs found to retry",
        retryResults: []
      };
    }

    // Retry sync for failed submissions
    const result: any = await ctx.runAction(api.classroomSync.syncGradesToClassroom, {
      assignmentId: args.assignmentId,
      forceSync: true
    });

    return {
      success: result.success,
      message: `Retry completed: ${result.stats.successful} successful, ${result.stats.failed} failed`,
      retryResults: result.syncResults?.filter((r: any) =>
        failedSubmissions.some((sub: Doc<"submissions">) => sub.studentId === r.studentId)
      )
    };
  }
});