import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// SUBMISSION PROCESSING PIPELINE
// ============================================

/**
 * Pipeline stage status tracking
 */
type PipelineStage = "received" | "validated" | "grading" | "graded" | "reviewed" | "published" | "failed";

interface SubmissionPipelineStatus {
  submissionId: string;
  currentStage: PipelineStage;
  stageHistory: Array<{
    stage: PipelineStage;
    timestamp: number;
    duration?: number;
    error?: string;
    metadata?: any;
  }>;
  errors: string[];
  warnings: string[];
}

/**
 * Validation rules for submissions
 */
interface ValidationRule {
  rule: string;
  severity: "error" | "warning";
  message: string;
  condition: (submission: any, assignment: any) => boolean;
}

/**
 * Built-in validation rules
 */
const VALIDATION_RULES: ValidationRule[] = [
  {
    rule: "response_count",
    severity: "error",
    message: "Submission must have responses for all required questions",
    condition: (submission, assignment) => {
      const requiredQuestions = assignment.questions?.filter((q: any) => q.required !== false) || [];
      const responseQuestionIds = new Set(submission.responses.map((r: any) => r.questionId));
      return requiredQuestions.every((q: any) => responseQuestionIds.has(q.questionId));
    }
  },
  {
    rule: "response_not_empty",
    severity: "error",
    message: "All responses must have content",
    condition: (submission, assignment) => {
      return submission.responses.every((r: any) => {
        const response = Array.isArray(r.response) ? r.response.join('') : r.response;
        return response && response.trim().length > 0;
      });
    }
  },
  {
    rule: "submission_timing",
    severity: "warning",
    message: "Submission received after deadline",
    condition: (submission, assignment) => {
      if (!assignment.dueDate) return true;
      return submission.submissionTime <= new Date(assignment.dueDate).getTime();
    }
  },
  {
    rule: "file_attachments",
    severity: "warning",
    message: "Some responses may have missing file attachments",
    condition: (submission, assignment) => {
      // Check if file upload questions have file responses
      return submission.responses.every((r: any) => {
        const question = assignment.questions?.find((q: any) => q.questionId === r.questionId);
        if (question?.questionType === "FILE_UPLOAD") {
          return r.fileUploadAnswers && r.fileUploadAnswers.length > 0;
        }
        return true;
      });
    }
  }
];

/**
 * Initialize submission pipeline status
 */
export const initializeSubmissionPipeline = mutation({
  args: {
    submissionId: v.id("submissions")
  },
  handler: async (ctx, args) => {
    const pipelineStatus: SubmissionPipelineStatus = {
      submissionId: args.submissionId,
      currentStage: "received",
      stageHistory: [{
        stage: "received",
        timestamp: Date.now()
      }],
      errors: [],
      warnings: []
    };

    // Store pipeline status in a separate table or as part of submission
    await ctx.db.patch(args.submissionId, {
      pipelineStatus: pipelineStatus as any
    });

    return pipelineStatus;
  }
});

/**
 * Validate submission against rules
 */
export const validateSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    customRules: v.optional(v.array(v.object({
      rule: v.string(),
      severity: v.union(v.literal("error"), v.literal("warning")),
      message: v.string()
    })))
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Get assignment details for validation
    const assignment = await ctx.db
      .query("assignments")
      .filter(q => q.eq(q.field("_id"), submission.assignmentId))
      .first();

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Get grading configuration
    const gradingConfig = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", submission.assignmentId))
      .first();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Run built-in validation rules
    for (const rule of VALIDATION_RULES) {
      try {
        if (!rule.condition(submission, { ...assignment, ...gradingConfig })) {
          if (rule.severity === "error") {
            errors.push(`${rule.rule}: ${rule.message}`);
          } else {
            warnings.push(`${rule.rule}: ${rule.message}`);
          }
        }
      } catch (error) {
        errors.push(`Validation rule ${rule.rule} failed: ${error}`);
      }
    }

    // Run custom validation rules if provided
    if (args.customRules) {
      for (const customRule of args.customRules) {
        // Custom rule validation logic would go here
        // For now, just log that custom rules were provided
        warnings.push(`Custom rule ${customRule.rule} evaluation not implemented`);
      }
    }

    // Update submission pipeline status
    const newStage: PipelineStage = errors.length > 0 ? "failed" : "validated";
    const currentPipelineStatus = submission.pipelineStatus as any || {
      submissionId: args.submissionId,
      currentStage: "received",
      stageHistory: [],
      errors: [],
      warnings: []
    };

    const updatedPipelineStatus = {
      ...currentPipelineStatus,
      currentStage: newStage,
      stageHistory: [
        ...currentPipelineStatus.stageHistory,
        {
          stage: "validated",
          timestamp: Date.now(),
          metadata: { errorsFound: errors.length, warningsFound: warnings.length }
        }
      ],
      errors: [...currentPipelineStatus.errors, ...errors],
      warnings: [...currentPipelineStatus.warnings, ...warnings]
    };

    await ctx.db.patch(args.submissionId, {
      pipelineStatus: updatedPipelineStatus,
      validationErrors: errors,
      validationWarnings: warnings
    });

    return {
      success: errors.length === 0,
      stage: newStage,
      errors,
      warnings,
      canProceedToGrading: errors.length === 0
    };
  }
});

/**
 * Process submission through the entire pipeline
 */
export const processSubmissionPipeline = mutation({
  args: {
    submissionId: v.id("submissions"),
    options: v.optional(v.object({
      skipValidation: v.optional(v.boolean()),
      gradingRules: v.optional(v.array(v.object({
        questionId: v.string(),
        algorithm: v.string(),
        parameters: v.any()
      }))),
      autoPublish: v.optional(v.boolean()),
      notifyStudent: v.optional(v.boolean())
    }))
  },
  handler: async (ctx, args) => {
    const options = args.options || {};
    const startTime = Date.now();

    try {
      // Step 1: Initialize pipeline
      await ctx.runMutation(api.submissionPipeline.initializeSubmissionPipeline, {
        submissionId: args.submissionId
      });

      // Step 2: Validation (unless skipped)
      if (!options.skipValidation) {
        const validationResult = await ctx.runMutation(api.submissionPipeline.validateSubmission, {
          submissionId: args.submissionId
        });

        if (!validationResult.canProceedToGrading) {
          return {
            success: false,
            stage: "failed",
            message: "Validation failed",
            errors: validationResult.errors,
            warnings: validationResult.warnings
          };
        }
      }

      // Step 3: Update stage to grading
      await ctx.runMutation(api.submissionPipeline.updatePipelineStage, {
        submissionId: args.submissionId,
        stage: "grading"
      });

      // Step 4: Auto-grade submission
      const gradingResult = await ctx.runMutation(api.gradingEngine.enhancedAutoGradeSubmission, {
        submissionId: args.submissionId,
        gradingRules: options.gradingRules
      });

      if (!gradingResult.success) {
        await ctx.runMutation(api.submissionPipeline.updatePipelineStage, {
          submissionId: args.submissionId,
          stage: "failed",
          error: "Grading failed"
        });

        return {
          success: false,
          stage: "failed",
          message: "Grading failed"
        };
      }

      // Step 5: Mark as graded
      await ctx.runMutation(api.submissionPipeline.updatePipelineStage, {
        submissionId: args.submissionId,
        stage: "graded",
        metadata: {
          totalScore: gradingResult.totalScore,
          percentage: gradingResult.percentage,
          questionsGraded: gradingResult.questionsGraded
        }
      });

      // Step 6: Auto-publish if requested
      if (options.autoPublish) {
        await ctx.runMutation(api.submissionPipeline.updatePipelineStage, {
          submissionId: args.submissionId,
          stage: "published"
        });
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        stage: options.autoPublish ? "published" : "graded",
        gradingResult,
        processingTime,
        message: `Submission processed successfully in ${processingTime}ms`
      };

    } catch (error) {
      // Mark pipeline as failed
      await ctx.runMutation(api.submissionPipeline.updatePipelineStage, {
        submissionId: args.submissionId,
        stage: "failed",
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        stage: "failed",
        message: "Pipeline processing failed",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Update pipeline stage
 */
export const updatePipelineStage = mutation({
  args: {
    submissionId: v.id("submissions"),
    stage: v.string(),
    error: v.optional(v.string()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const currentPipelineStatus = submission.pipelineStatus as any || {
      submissionId: args.submissionId,
      currentStage: "received",
      stageHistory: [],
      errors: [],
      warnings: []
    };

    const stageEntry = {
      stage: args.stage as PipelineStage,
      timestamp: Date.now(),
      error: args.error,
      metadata: args.metadata
    };

    // Calculate duration from previous stage
    const lastStage = currentPipelineStatus.stageHistory[currentPipelineStatus.stageHistory.length - 1];
    if (lastStage) {
      stageEntry.metadata = {
        ...stageEntry.metadata,
        duration: Date.now() - lastStage.timestamp
      };
    }

    const updatedPipelineStatus = {
      ...currentPipelineStatus,
      currentStage: args.stage,
      stageHistory: [...currentPipelineStatus.stageHistory, stageEntry],
      errors: args.error ? [...currentPipelineStatus.errors, args.error] : currentPipelineStatus.errors
    };

    await ctx.db.patch(args.submissionId, {
      pipelineStatus: updatedPipelineStatus
    });

    return updatedPipelineStatus;
  }
});

/**
 * Get pipeline status for a submission
 */
export const getSubmissionPipelineStatus = query({
  args: {
    submissionId: v.id("submissions")
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      return null;
    }

    return submission.pipelineStatus as SubmissionPipelineStatus || null;
  }
});

/**
 * Get pipeline statistics for an assignment
 */
export const getAssignmentPipelineStats = query({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const stats = {
      totalSubmissions: submissions.length,
      stageBreakdown: {} as Record<PipelineStage, number>,
      avgProcessingTime: 0,
      errorsCount: 0,
      warningsCount: 0,
      successRate: 0
    };

    // Initialize stage counts
    const stages: PipelineStage[] = ["received", "validated", "grading", "graded", "reviewed", "published", "failed"];
    stages.forEach(stage => stats.stageBreakdown[stage] = 0);

    let totalProcessingTime = 0;
    let completedSubmissions = 0;

    submissions.forEach(submission => {
      const pipelineStatus = submission.pipelineStatus as SubmissionPipelineStatus;

      if (pipelineStatus) {
        // Count current stage
        stats.stageBreakdown[pipelineStatus.currentStage]++;

        // Count errors and warnings
        stats.errorsCount += pipelineStatus.errors?.length || 0;
        stats.warningsCount += pipelineStatus.warnings?.length || 0;

        // Calculate processing time for completed submissions
        if (pipelineStatus.currentStage === "graded" || pipelineStatus.currentStage === "published") {
          const firstStage = pipelineStatus.stageHistory[0];
          const lastStage = pipelineStatus.stageHistory[pipelineStatus.stageHistory.length - 1];

          if (firstStage && lastStage) {
            totalProcessingTime += lastStage.timestamp - firstStage.timestamp;
            completedSubmissions++;
          }
        }
      } else {
        // No pipeline status = received stage
        stats.stageBreakdown.received++;
      }
    });

    stats.avgProcessingTime = completedSubmissions > 0 ? totalProcessingTime / completedSubmissions : 0;
    stats.successRate = submissions.length > 0 ?
      (stats.stageBreakdown.graded + stats.stageBreakdown.published) / submissions.length * 100 : 0;

    return stats;
  }
});

/**
 * Retry failed submissions
 */
export const retryFailedSubmissions = mutation({
  args: {
    assignmentId: v.id("assignments"),
    submissionIds: v.optional(v.array(v.id("submissions")))
  },
  handler: async (ctx, args) => {
    // Get failed submissions for the assignment
    let submissions;

    if (args.submissionIds) {
      submissions = await Promise.all(
        args.submissionIds.map(id => ctx.db.get(id))
      );
      submissions = submissions.filter(s => s !== null);
    } else {
      submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
        .collect();
    }

    const failedSubmissions = submissions.filter(sub => {
      const pipelineStatus = sub.pipelineStatus as SubmissionPipelineStatus;
      return pipelineStatus?.currentStage === "failed";
    });

    const retryResults = [];

    for (const submission of failedSubmissions) {
      try {
        const result = await ctx.runMutation(api.submissionPipeline.processSubmissionPipeline, {
          submissionId: submission._id,
          options: { autoPublish: false }
        });

        retryResults.push({
          submissionId: submission._id,
          success: result.success,
          newStage: result.stage,
          message: result.message
        });
      } catch (error) {
        retryResults.push({
          submissionId: submission._id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      totalAttempted: failedSubmissions.length,
      successful: retryResults.filter(r => r.success).length,
      failed: retryResults.filter(r => !r.success).length,
      results: retryResults
    };
  }
});