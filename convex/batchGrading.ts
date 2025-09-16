import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// BATCH GRADING SYSTEM
// ============================================

/**
 * Batch grading job status
 */
type BatchJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface BatchGradingJob {
  jobId: string;
  assignmentId: string;
  userId: string;
  status: BatchJobStatus;
  submissionIds: string[];
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  settings: {
    gradingRules?: any[];
    skipAlreadyGraded: boolean;
    autoPublish: boolean;
    notifyStudents: boolean;
    batchSize: number;
    maxConcurrency: number;
  };
  results: {
    submissionId: string;
    status: "success" | "failed" | "skipped";
    message?: string;
    score?: number;
    processingTime?: number;
  }[];
  timestamps: {
    created: number;
    started?: number;
    completed?: number;
  };
  errors: string[];
}

/**
 * Create a batch grading job
 */
export const createBatchGradingJob = mutation({
  args: {
    assignmentId: v.id("assignments"),
    userId: v.string(),
    submissionIds: v.optional(v.array(v.id("submissions"))),
    settings: v.object({
      gradingRules: v.optional(v.array(v.any())),
      skipAlreadyGraded: v.optional(v.boolean()),
      autoPublish: v.optional(v.boolean()),
      notifyStudents: v.optional(v.boolean()),
      batchSize: v.optional(v.number()),
      maxConcurrency: v.optional(v.number())
    })
  },
  handler: async (ctx, args) => {
    // Get submissions to grade
    let submissions;
    if (args.submissionIds) {
      submissions = await Promise.all(
        args.submissionIds.map(id => ctx.db.get(id))
      );
      submissions = submissions.filter(s => s !== null && s.assignmentId === args.assignmentId);
    } else {
      submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
        .collect();
    }

    // Filter out already graded submissions if requested
    const submissionsToGrade = args.settings.skipAlreadyGraded
      ? submissions.filter(s => !s.autoGraded)
      : submissions;

    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const batchJob: BatchGradingJob = {
      jobId,
      assignmentId: args.assignmentId,
      userId: args.userId,
      status: "pending",
      submissionIds: submissionsToGrade.map(s => s._id),
      progress: {
        total: submissionsToGrade.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      settings: {
        skipAlreadyGraded: args.settings.skipAlreadyGraded ?? true,
        autoPublish: args.settings.autoPublish ?? false,
        notifyStudents: args.settings.notifyStudents ?? false,
        batchSize: args.settings.batchSize ?? 10,
        maxConcurrency: args.settings.maxConcurrency ?? 3,
        gradingRules: args.settings.gradingRules
      },
      results: [],
      timestamps: {
        created: Date.now()
      },
      errors: []
    };

    // Store the batch job (in a real implementation, this would go in a separate table)
    const gradingSessionId = await ctx.db.insert("gradingSessions", {
      assignmentId: args.assignmentId,
      userId: args.userId,
      sessionType: "batch",
      status: "pending",
      startTime: Date.now(),
      totalSubmissions: submissionsToGrade.length,
      processedSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      batchJobData: batchJob as any
    });

    return {
      jobId,
      gradingSessionId,
      totalSubmissions: submissionsToGrade.length,
      status: "pending"
    };
  }
});

/**
 * Execute batch grading job
 */
export const executeBatchGradingJob = action({
  args: {
    gradingSessionId: v.id("gradingSessions")
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.autograding.getGradingSession, {
      sessionId: args.gradingSessionId
    });

    if (!session || !session.batchJobData) {
      throw new Error("Batch grading session not found");
    }

    const batchJob = session.batchJobData as BatchGradingJob;

    try {
      // Update job status to running
      await ctx.runMutation(api.batchGrading.updateBatchJobStatus, {
        gradingSessionId: args.gradingSessionId,
        status: "running",
        startTime: Date.now()
      });

      // Process submissions in batches
      const { batchSize, maxConcurrency } = batchJob.settings;
      const submissionIds = batchJob.submissionIds;

      for (let i = 0; i < submissionIds.length; i += batchSize) {
        const batch = submissionIds.slice(i, i + batchSize);

        // Process this batch with controlled concurrency
        const batchPromises = batch.map(async (submissionId, index) => {
          // Add small delay to prevent overwhelming the system
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100 * index));
          }

          return await ctx.runMutation(api.batchGrading.processSingleSubmissionInBatch, {
            gradingSessionId: args.gradingSessionId,
            submissionId: submissionId as any,
            batchSettings: batchJob.settings
          });
        });

        // Wait for this batch to complete before starting the next
        const batchResults = await Promise.allSettled(batchPromises);

        // Update progress after each batch
        const batchProgress = batchResults.reduce((acc, result) => {
          if (result.status === "fulfilled") {
            acc[result.value.status]++;
          } else {
            acc.failed++;
          }
          return acc;
        }, { success: 0, failed: 0, skipped: 0 });

        await ctx.runMutation(api.batchGrading.updateBatchProgress, {
          gradingSessionId: args.gradingSessionId,
          batchProgress: {
            processed: Math.min(i + batchSize, submissionIds.length),
            successful: batchProgress.success,
            failed: batchProgress.failed,
            skipped: batchProgress.skipped
          }
        });

        // Small delay between batches
        if (i + batchSize < submissionIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Mark job as completed
      await ctx.runMutation(api.batchGrading.updateBatchJobStatus, {
        gradingSessionId: args.gradingSessionId,
        status: "completed",
        completedTime: Date.now()
      });

      return {
        success: true,
        message: "Batch grading completed successfully",
        totalProcessed: submissionIds.length
      };

    } catch (error) {
      // Mark job as failed
      await ctx.runMutation(api.batchGrading.updateBatchJobStatus, {
        gradingSessionId: args.gradingSessionId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: "Batch grading failed",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Process a single submission within a batch
 */
export const processSingleSubmissionInBatch = mutation({
  args: {
    gradingSessionId: v.id("gradingSessions"),
    submissionId: v.id("submissions"),
    batchSettings: v.any()
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const submission = await ctx.db.get(args.submissionId);
      if (!submission) {
        return {
          submissionId: args.submissionId,
          status: "failed" as const,
          message: "Submission not found"
        };
      }

      // Skip if already graded and skipAlreadyGraded is true
      if (args.batchSettings.skipAlreadyGraded && submission.autoGraded) {
        return {
          submissionId: args.submissionId,
          status: "skipped" as const,
          message: "Already graded"
        };
      }

      // Process through pipeline
      const result = await ctx.runMutation(api.submissionPipeline.processSubmissionPipeline, {
        submissionId: args.submissionId,
        options: {
          gradingRules: args.batchSettings.gradingRules,
          autoPublish: args.batchSettings.autoPublish,
          skipValidation: false
        }
      });

      const processingTime = Date.now() - startTime;

      if (result.success) {
        return {
          submissionId: args.submissionId,
          status: "success" as const,
          score: result.gradingResult?.totalScore,
          processingTime,
          message: "Graded successfully"
        };
      } else {
        return {
          submissionId: args.submissionId,
          status: "failed" as const,
          message: result.message || "Grading failed",
          processingTime
        };
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        submissionId: args.submissionId,
        status: "failed" as const,
        message: error instanceof Error ? error.message : String(error),
        processingTime
      };
    }
  }
});

/**
 * Update batch job status
 */
export const updateBatchJobStatus = mutation({
  args: {
    gradingSessionId: v.id("gradingSessions"),
    status: v.string(),
    startTime: v.optional(v.number()),
    completedTime: v.optional(v.number()),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.gradingSessionId);
    if (!session || !session.batchJobData) {
      throw new Error("Grading session not found");
    }

    const batchJob = session.batchJobData as BatchGradingJob;
    const updatedBatchJob = {
      ...batchJob,
      status: args.status as BatchJobStatus,
      timestamps: {
        ...batchJob.timestamps,
        ...(args.startTime && { started: args.startTime }),
        ...(args.completedTime && { completed: args.completedTime })
      },
      errors: args.error ? [...batchJob.errors, args.error] : batchJob.errors
    };

    await ctx.db.patch(args.gradingSessionId, {
      status: args.status,
      ...(args.startTime && { startTime: args.startTime }),
      ...(args.completedTime && { endTime: args.completedTime }),
      batchJobData: updatedBatchJob
    });

    return updatedBatchJob;
  }
});

/**
 * Update batch progress
 */
export const updateBatchProgress = mutation({
  args: {
    gradingSessionId: v.id("gradingSessions"),
    batchProgress: v.object({
      processed: v.number(),
      successful: v.number(),
      failed: v.number(),
      skipped: v.number()
    })
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.gradingSessionId);
    if (!session || !session.batchJobData) {
      throw new Error("Grading session not found");
    }

    const batchJob = session.batchJobData as BatchGradingJob;
    const updatedBatchJob = {
      ...batchJob,
      progress: {
        ...batchJob.progress,
        processed: args.batchProgress.processed,
        successful: batchJob.progress.successful + args.batchProgress.successful,
        failed: batchJob.progress.failed + args.batchProgress.failed,
        skipped: batchJob.progress.skipped + args.batchProgress.skipped
      }
    };

    await ctx.db.patch(args.gradingSessionId, {
      processedSubmissions: args.batchProgress.processed,
      successfulSubmissions: updatedBatchJob.progress.successful,
      failedSubmissions: updatedBatchJob.progress.failed,
      batchJobData: updatedBatchJob
    });

    return updatedBatchJob;
  }
});

/**
 * Get batch grading job status
 */
export const getBatchJobStatus = query({
  args: {
    gradingSessionId: v.id("gradingSessions")
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.gradingSessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session._id,
      status: session.status,
      batchJobData: session.batchJobData as BatchGradingJob,
      timestamps: {
        created: session._creationTime,
        started: session.startTime,
        ended: session.endTime
      }
    };
  }
});

/**
 * Cancel a running batch grading job
 */
export const cancelBatchGradingJob = mutation({
  args: {
    gradingSessionId: v.id("gradingSessions")
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.gradingSessionId);
    if (!session) {
      throw new Error("Grading session not found");
    }

    if (session.status !== "running" && session.status !== "pending") {
      throw new Error("Cannot cancel job that is not running or pending");
    }

    const batchJob = session.batchJobData as BatchGradingJob;
    const updatedBatchJob = {
      ...batchJob,
      status: "cancelled" as BatchJobStatus,
      timestamps: {
        ...batchJob.timestamps,
        completed: Date.now()
      }
    };

    await ctx.db.patch(args.gradingSessionId, {
      status: "cancelled",
      endTime: Date.now(),
      batchJobData: updatedBatchJob
    });

    return {
      success: true,
      message: "Batch grading job cancelled"
    };
  }
});

/**
 * Get batch grading history for an assignment
 */
export const getBatchGradingHistory = query({
  args: {
    assignmentId: v.id("assignments"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("gradingSessions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .order("desc")
      .take(args.limit || 20);

    return sessions
      .filter(session => session.sessionType === "batch")
      .map(session => ({
        sessionId: session._id,
        status: session.status,
        totalSubmissions: session.totalSubmissions,
        processedSubmissions: session.processedSubmissions,
        successfulSubmissions: session.successfulSubmissions,
        failedSubmissions: session.failedSubmissions,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.endTime ? session.endTime - session.startTime : null,
        batchJobData: session.batchJobData as BatchGradingJob
      }));
  }
});

/**
 * Get performance metrics for batch grading
 */
export const getBatchGradingMetrics = query({
  args: {
    assignmentId: v.id("assignments"),
    timeRangeHours: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeHours || 24;
    const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

    const sessions = await ctx.db
      .query("gradingSessions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .filter(q => q.gte(q.field("startTime"), cutoffTime))
      .collect();

    const batchSessions = sessions.filter(session => session.sessionType === "batch");

    const metrics = {
      totalJobs: batchSessions.length,
      completedJobs: batchSessions.filter(s => s.status === "completed").length,
      failedJobs: batchSessions.filter(s => s.status === "failed").length,
      cancelledJobs: batchSessions.filter(s => s.status === "cancelled").length,
      totalSubmissionsProcessed: batchSessions.reduce((sum, s) => sum + (s.processedSubmissions || 0), 0),
      totalSubmissionsSuccessful: batchSessions.reduce((sum, s) => sum + (s.successfulSubmissions || 0), 0),
      avgProcessingTime: 0,
      avgThroughputPerMinute: 0,
      successRate: 0
    };

    const completedSessions = batchSessions.filter(s => s.status === "completed" && s.endTime);
    if (completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0);
      metrics.avgProcessingTime = totalDuration / completedSessions.length;

      const totalProcessed = completedSessions.reduce((sum, s) => sum + (s.processedSubmissions || 0), 0);
      metrics.avgThroughputPerMinute = totalProcessed / (totalDuration / (1000 * 60));
    }

    if (metrics.totalSubmissionsProcessed > 0) {
      metrics.successRate = (metrics.totalSubmissionsSuccessful / metrics.totalSubmissionsProcessed) * 100;
    }

    return metrics;
  }
});

/**
 * Estimate batch grading time
 */
export const estimateBatchGradingTime = query({
  args: {
    assignmentId: v.id("assignments"),
    submissionCount: v.number(),
    batchSize: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Get historical performance data
    const recentSessions = await ctx.db
      .query("gradingSessions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .order("desc")
      .take(5);

    const completedBatchSessions = recentSessions.filter(
      s => s.sessionType === "batch" && s.status === "completed" && s.endTime
    );

    let avgTimePerSubmission = 2000; // Default 2 seconds per submission

    if (completedBatchSessions.length > 0) {
      const totalTime = completedBatchSessions.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0);
      const totalSubmissions = completedBatchSessions.reduce((sum, s) => sum + (s.processedSubmissions || 0), 0);

      if (totalSubmissions > 0) {
        avgTimePerSubmission = totalTime / totalSubmissions;
      }
    }

    const batchSize = args.batchSize || 10;
    const estimatedTotalTime = avgTimePerSubmission * args.submissionCount;

    // Add overhead for batch processing (10% + batch delay)
    const batchOverhead = Math.ceil(args.submissionCount / batchSize) * 500; // 500ms delay between batches
    const finalEstimate = estimatedTotalTime * 1.1 + batchOverhead;

    return {
      estimatedTimeMs: Math.round(finalEstimate),
      estimatedTimeFormatted: this.formatDuration(finalEstimate),
      avgTimePerSubmission: Math.round(avgTimePerSubmission),
      recommendedBatchSize: batchSize,
      basedOnSessions: completedBatchSessions.length
    };
  }
});

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}