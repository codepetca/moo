import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// AI-POWERED GRADING SYSTEM
// ============================================

/**
 * AI Grading Configuration
 */
interface AIGradingConfig {
  provider: "openai" | "anthropic" | "local";
  model: string;
  temperature: number;
  maxTokens: number;
  rubric: {
    criteria: Array<{
      name: string;
      description: string;
      points: number;
      levels: Array<{
        level: string;
        description: string;
        points: number;
      }>;
    }>;
  };
  gradingPrompt: string;
  confidenceThreshold: number;
  requireHumanReview: boolean;
}

/**
 * AI Grading Result
 */
interface AIGradingResult {
  score: number;
  maxPoints: number;
  percentage: number;
  confidence: number;
  feedback: string;
  criteriaScores: Array<{
    criterion: string;
    score: number;
    maxPoints: number;
    level: string;
    reasoning: string;
  }>;
  flaggedForReview: boolean;
  processingTime: number;
  modelUsed: string;
}

/**
 * Built-in grading prompts for different subjects
 */
const GRADING_PROMPTS = {
  essay: `You are an expert teacher grading a student essay. Please evaluate the response based on the provided rubric.

Rubric:
{rubric}

Student Response:
{studentResponse}

Expected Answer (if provided):
{expectedAnswer}

Please provide:
1. A score for each criterion in the rubric
2. Overall score and percentage
3. Constructive feedback
4. Confidence level (0-1)
5. Whether this needs human review

Return your response in the following JSON format:
{
  "score": <total_points_earned>,
  "maxPoints": <total_possible_points>,
  "percentage": <percentage_score>,
  "confidence": <confidence_0_to_1>,
  "feedback": "<constructive_feedback>",
  "criteriaScores": [
    {
      "criterion": "<criterion_name>",
      "score": <points_earned>,
      "maxPoints": <points_possible>,
      "level": "<performance_level>",
      "reasoning": "<brief_explanation>"
    }
  ],
  "flaggedForReview": <boolean>
}`,

  shortAnswer: `You are an expert teacher grading a short answer question. Evaluate based on content accuracy and completeness.

Question: {question}
Expected Answer: {expectedAnswer}
Student Response: {studentResponse}
Points Possible: {maxPoints}

Grading Criteria:
- Content accuracy (70%)
- Completeness (20%)
- Clarity (10%)

Provide a score, percentage, feedback, and confidence level in JSON format:
{
  "score": <points_earned>,
  "percentage": <percentage>,
  "confidence": <0_to_1>,
  "feedback": "<explanation>",
  "flaggedForReview": <boolean_if_confidence_low>
}`,

  math: `You are an expert math teacher grading a mathematical response. Focus on methodology, accuracy, and presentation.

Problem: {question}
Student Response: {studentResponse}
Expected Answer: {expectedAnswer}
Points: {maxPoints}

Evaluate:
1. Correct methodology/approach (50%)
2. Accurate calculations (40%)
3. Clear presentation (10%)

Return JSON with score, feedback, and confidence.`,

  science: `You are a science teacher evaluating a student's scientific explanation. Assess scientific accuracy, reasoning, and use of terminology.

Question: {question}
Student Response: {studentResponse}
Key Concepts: {expectedAnswer}
Points: {maxPoints}

Criteria:
- Scientific accuracy (50%)
- Quality of reasoning (30%)
- Proper terminology (20%)

Provide detailed feedback with score and confidence level.`
};

/**
 * Configure AI grading for an assignment
 */
export const configureAIGrading = mutation({
  args: {
    assignmentId: v.id("assignments"),
    aiConfig: v.object({
      provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("local")),
      model: v.string(),
      temperature: v.number(),
      maxTokens: v.number(),
      rubric: v.object({
        criteria: v.array(v.object({
          name: v.string(),
          description: v.string(),
          points: v.number(),
          levels: v.array(v.object({
            level: v.string(),
            description: v.string(),
            points: v.number()
          }))
        }))
      }),
      gradingPrompt: v.string(),
      confidenceThreshold: v.number(),
      requireHumanReview: v.boolean()
    })
  },
  handler: async (ctx, args) => {
    // Update grading configuration with AI settings
    const gradingConfig = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .first();

    if (!gradingConfig) {
      throw new Error("Grading configuration not found for assignment");
    }

    await ctx.db.patch(gradingConfig._id, {
      aiGradingConfig: args.aiConfig,
      aiGradingEnabled: true,
      lastUpdated: Date.now()
    });

    return {
      success: true,
      message: "AI grading configuration updated"
    };
  }
});

/**
 * Grade a response using AI
 */
export const gradeWithAI = action({
  args: {
    submissionId: v.id("submissions"),
    questionId: v.string(),
    overrideConfig: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const submission = await ctx.runQuery(api.autograding.getSubmissionDetails, {
      submissionId: args.submissionId
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Get grading configuration
    const gradingConfig = await ctx.runQuery(api.autograding.getGradingConfig, {
      assignmentId: submission.assignmentId
    });

    if (!gradingConfig?.aiGradingConfig && !args.overrideConfig) {
      throw new Error("AI grading not configured for this assignment");
    }

    const aiConfig = args.overrideConfig || gradingConfig.aiGradingConfig;
    const response = submission.responses.find(r => r.questionId === args.questionId);

    if (!response) {
      throw new Error("Response not found for question");
    }

    const question = gradingConfig.questions.find(q => q.questionId === args.questionId);
    if (!question) {
      throw new Error("Question configuration not found");
    }

    const startTime = Date.now();

    try {
      // Prepare the grading prompt
      const prompt = aiConfig.gradingPrompt
        .replace("{rubric}", JSON.stringify(aiConfig.rubric, null, 2))
        .replace("{studentResponse}", Array.isArray(response.response) ? response.response.join('\n') : response.response)
        .replace("{expectedAnswer}", question.correctAnswer || "")
        .replace("{question}", question.title || "")
        .replace("{maxPoints}", question.points.toString());

      // Call AI service (this would be replaced with actual AI API calls)
      const aiResult = await callAIGradingService({
        provider: aiConfig.provider,
        model: aiConfig.model,
        prompt,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens
      });

      const processingTime = Date.now() - startTime;

      // Parse AI response
      const gradingResult: AIGradingResult = {
        ...aiResult,
        processingTime,
        modelUsed: `${aiConfig.provider}:${aiConfig.model}`,
        flaggedForReview: aiResult.confidence < aiConfig.confidenceThreshold || aiConfig.requireHumanReview
      };

      // Store AI grading result
      await ctx.runMutation(api.aiGrading.storeAIGradingResult, {
        submissionId: args.submissionId,
        questionId: args.questionId,
        result: gradingResult
      });

      return gradingResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log the error and return failure result
      await ctx.runMutation(api.aiGrading.storeAIGradingResult, {
        submissionId: args.submissionId,
        questionId: args.questionId,
        result: {
          score: 0,
          maxPoints: question.points,
          percentage: 0,
          confidence: 0,
          feedback: `AI grading failed: ${error instanceof Error ? error.message : String(error)}`,
          criteriaScores: [],
          flaggedForReview: true,
          processingTime,
          modelUsed: `${aiConfig.provider}:${aiConfig.model}`
        }
      });

      throw error;
    }
  }
});

/**
 * Simulate AI grading service call (replace with actual implementation)
 */
async function callAIGradingService(params: {
  provider: string;
  model: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<Partial<AIGradingResult>> {
  // This is a mock implementation - replace with actual AI service calls
  // For now, return a simulated response

  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // Simulate API delay

  // Generate a simulated grading result
  const simulatedScore = Math.floor(Math.random() * 100);
  const confidence = 0.7 + Math.random() * 0.3; // Random confidence between 0.7-1.0

  return {
    score: simulatedScore,
    maxPoints: 100,
    percentage: simulatedScore,
    confidence,
    feedback: `This is a simulated AI grading result. The response demonstrates ${
      simulatedScore > 80 ? 'excellent' :
      simulatedScore > 60 ? 'good' :
      simulatedScore > 40 ? 'satisfactory' : 'needs improvement'
    } understanding of the topic. [This would be replaced with actual AI-generated feedback]`,
    criteriaScores: [
      {
        criterion: "Content Knowledge",
        score: Math.floor(simulatedScore * 0.5),
        maxPoints: 50,
        level: simulatedScore > 70 ? "Proficient" : "Developing",
        reasoning: "Simulated criterion evaluation"
      },
      {
        criterion: "Critical Thinking",
        score: Math.floor(simulatedScore * 0.3),
        maxPoints: 30,
        level: simulatedScore > 70 ? "Proficient" : "Developing",
        reasoning: "Simulated criterion evaluation"
      },
      {
        criterion: "Communication",
        score: Math.floor(simulatedScore * 0.2),
        maxPoints: 20,
        level: simulatedScore > 70 ? "Proficient" : "Developing",
        reasoning: "Simulated criterion evaluation"
      }
    ]
  };
}

/**
 * Store AI grading result
 */
export const storeAIGradingResult = mutation({
  args: {
    submissionId: v.id("submissions"),
    questionId: v.string(),
    result: v.any()
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Update the specific response with AI grading result
    const updatedResponses = submission.responses.map(response => {
      if (response.questionId === args.questionId) {
        return {
          ...response,
          aiGradingResult: args.result,
          gradedWithAI: true,
          aiGradingTimestamp: Date.now()
        };
      }
      return response;
    });

    await ctx.db.patch(args.submissionId, {
      responses: updatedResponses
    });

    return {
      success: true,
      result: args.result
    };
  }
});

/**
 * Batch AI grading for assignment
 */
export const batchAIGrading = action({
  args: {
    assignmentId: v.id("assignments"),
    questionIds: v.array(v.string()),
    submissionIds: v.optional(v.array(v.id("submissions"))),
    options: v.optional(v.object({
      maxConcurrency: v.optional(v.number()),
      skipLowConfidence: v.optional(v.boolean())
    }))
  },
  handler: async (ctx, args) => {
    const options = args.options || {};
    const maxConcurrency = options.maxConcurrency || 3;

    // Get submissions to process
    let submissions;
    if (args.submissionIds) {
      submissions = await Promise.all(
        args.submissionIds.map(id => ctx.runQuery(api.autograding.getSubmissionDetails, { submissionId: id }))
      );
      submissions = submissions.filter(s => s !== null);
    } else {
      submissions = await ctx.runQuery(api.autograding.getSubmissions, {
        assignmentId: args.assignmentId,
        courseId: "all" // This would need to be properly handled
      });
    }

    const results = [];
    let processedCount = 0;

    // Process submissions in batches with controlled concurrency
    for (let i = 0; i < submissions.length; i += maxConcurrency) {
      const batch = submissions.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (submission) => {
        const submissionResults = [];

        for (const questionId of args.questionIds) {
          try {
            const result = await ctx.runAction(api.aiGrading.gradeWithAI, {
              submissionId: submission._id,
              questionId
            });

            submissionResults.push({
              submissionId: submission._id,
              questionId,
              success: true,
              result
            });

          } catch (error) {
            submissionResults.push({
              submissionId: submission._id,
              questionId,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        return submissionResults;
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(...result.value);
        } else {
          results.push({
            submissionId: batch[index]._id,
            questionId: "unknown",
            success: false,
            error: result.reason
          });
        }
      });

      processedCount += batch.length;

      // Add delay between batches to prevent rate limiting
      if (i + maxConcurrency < submissions.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      totalSubmissions: submissions.length,
      totalQuestions: args.questionIds.length,
      totalGradings: results.length,
      successful: successCount,
      failed: failureCount,
      successRate: results.length > 0 ? (successCount / results.length) * 100 : 0,
      results
    };
  }
});

/**
 * Get AI grading analytics
 */
export const getAIGradingAnalytics = query({
  args: {
    assignmentId: v.id("assignments"),
    timeRangeHours: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeHours || 24;
    const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const aiGradedResponses = submissions.flatMap(submission =>
      submission.responses.filter(response =>
        response.gradedWithAI && response.aiGradingTimestamp && response.aiGradingTimestamp > cutoffTime
      )
    );

    if (aiGradedResponses.length === 0) {
      return {
        totalAIGradings: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        flaggedForReviewCount: 0,
        flaggedForReviewPercentage: 0,
        scoreDistribution: {},
        modelUsage: {},
        criteriaPerformance: []
      };
    }

    const analytics = {
      totalAIGradings: aiGradedResponses.length,
      avgConfidence: 0,
      avgProcessingTime: 0,
      flaggedForReviewCount: 0,
      flaggedForReviewPercentage: 0,
      scoreDistribution: {} as Record<string, number>,
      modelUsage: {} as Record<string, number>,
      criteriaPerformance: [] as Array<{
        criterion: string;
        avgScore: number;
        maxScore: number;
        avgPercentage: number;
        sampleSize: number;
      }>
    };

    let totalConfidence = 0;
    let totalProcessingTime = 0;
    const scoreRanges = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    const criteriaStats = new Map<string, { totalScore: number; maxScore: number; count: number }>();

    aiGradedResponses.forEach(response => {
      const aiResult = response.aiGradingResult;
      if (!aiResult) return;

      totalConfidence += aiResult.confidence || 0;
      totalProcessingTime += aiResult.processingTime || 0;

      if (aiResult.flaggedForReview) {
        analytics.flaggedForReviewCount++;
      }

      // Score distribution
      const scoreRange = scoreRanges.find(range => {
        const [min, max] = range.split('-').map(Number);
        const percentage = aiResult.percentage || 0;
        return percentage >= min && percentage <= max;
      }) || "unknown";

      analytics.scoreDistribution[scoreRange] = (analytics.scoreDistribution[scoreRange] || 0) + 1;

      // Model usage
      const model = aiResult.modelUsed || "unknown";
      analytics.modelUsage[model] = (analytics.modelUsage[model] || 0) + 1;

      // Criteria performance
      if (aiResult.criteriaScores) {
        aiResult.criteriaScores.forEach(criteria => {
          const existing = criteriaStats.get(criteria.criterion) || { totalScore: 0, maxScore: 0, count: 0 };
          existing.totalScore += criteria.score;
          existing.maxScore = Math.max(existing.maxScore, criteria.maxPoints);
          existing.count++;
          criteriaStats.set(criteria.criterion, existing);
        });
      }
    });

    analytics.avgConfidence = totalConfidence / aiGradedResponses.length;
    analytics.avgProcessingTime = totalProcessingTime / aiGradedResponses.length;
    analytics.flaggedForReviewPercentage = (analytics.flaggedForReviewCount / aiGradedResponses.length) * 100;

    // Convert criteria stats to final format
    analytics.criteriaPerformance = Array.from(criteriaStats.entries()).map(([criterion, stats]) => ({
      criterion,
      avgScore: stats.totalScore / stats.count,
      maxScore: stats.maxScore,
      avgPercentage: (stats.totalScore / stats.count / stats.maxScore) * 100,
      sampleSize: stats.count
    }));

    return analytics;
  }
});

/**
 * Get AI grading templates
 */
export const getAIGradingTemplates = query({
  args: {},
  handler: async (ctx, args) => {
    return {
      prompts: GRADING_PROMPTS,
      rubricTemplates: {
        essay: {
          criteria: [
            {
              name: "Content Knowledge",
              description: "Demonstrates understanding of key concepts and ideas",
              points: 25,
              levels: [
                { level: "Excellent", description: "Shows deep understanding with accurate details", points: 25 },
                { level: "Proficient", description: "Shows good understanding with mostly accurate information", points: 20 },
                { level: "Developing", description: "Shows basic understanding with some inaccuracies", points: 15 },
                { level: "Beginning", description: "Shows limited understanding with significant gaps", points: 10 }
              ]
            },
            {
              name: "Critical Analysis",
              description: "Analyzes information and draws logical conclusions",
              points: 25,
              levels: [
                { level: "Excellent", description: "Demonstrates sophisticated analysis and reasoning", points: 25 },
                { level: "Proficient", description: "Shows clear analysis with logical connections", points: 20 },
                { level: "Developing", description: "Shows basic analysis with some logical gaps", points: 15 },
                { level: "Beginning", description: "Shows minimal analysis or reasoning", points: 10 }
              ]
            },
            {
              name: "Organization & Structure",
              description: "Ideas are clearly organized and well-structured",
              points: 25,
              levels: [
                { level: "Excellent", description: "Clear, logical structure with smooth transitions", points: 25 },
                { level: "Proficient", description: "Generally well-organized with clear main points", points: 20 },
                { level: "Developing", description: "Some organization present but may lack clarity", points: 15 },
                { level: "Beginning", description: "Limited organization, difficult to follow", points: 10 }
              ]
            },
            {
              name: "Writing Mechanics",
              description: "Grammar, spelling, and writing conventions",
              points: 25,
              levels: [
                { level: "Excellent", description: "Excellent grammar, spelling, and conventions", points: 25 },
                { level: "Proficient", description: "Good writing with minor errors that don't impede understanding", points: 20 },
                { level: "Developing", description: "Some errors in writing that may distract from content", points: 15 },
                { level: "Beginning", description: "Frequent errors that interfere with understanding", points: 10 }
              ]
            }
          ]
        },
        shortAnswer: {
          criteria: [
            {
              name: "Accuracy",
              description: "Correctness of information provided",
              points: 70,
              levels: [
                { level: "Correct", description: "Information is accurate and complete", points: 70 },
                { level: "Mostly Correct", description: "Information is mostly accurate with minor errors", points: 50 },
                { level: "Partially Correct", description: "Some accurate information but significant gaps", points: 30 },
                { level: "Incorrect", description: "Information is largely inaccurate", points: 0 }
              ]
            },
            {
              name: "Completeness",
              description: "Addresses all parts of the question",
              points: 20,
              levels: [
                { level: "Complete", description: "Fully addresses all aspects of the question", points: 20 },
                { level: "Mostly Complete", description: "Addresses most aspects with minor omissions", points: 15 },
                { level: "Partially Complete", description: "Addresses some aspects but misses key points", points: 10 },
                { level: "Incomplete", description: "Fails to address the question adequately", points: 0 }
              ]
            },
            {
              name: "Clarity",
              description: "Clear and understandable explanation",
              points: 10,
              levels: [
                { level: "Very Clear", description: "Explanation is clear and easy to understand", points: 10 },
                { level: "Clear", description: "Generally clear with minor ambiguities", points: 8 },
                { level: "Somewhat Clear", description: "Understandable but may be confusing in places", points: 5 },
                { level: "Unclear", description: "Difficult to understand or follow", points: 0 }
              ]
            }
          ]
        }
      }
    };
  }
});