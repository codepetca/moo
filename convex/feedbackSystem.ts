import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// INTELLIGENT FEEDBACK GENERATION SYSTEM
// ============================================

/**
 * Feedback Configuration
 */
interface FeedbackConfig {
  enabled: boolean;
  feedbackStyle: "constructive" | "detailed" | "brief" | "encouraging";
  includeCorrectAnswers: boolean;
  includeHints: boolean;
  includeResources: boolean;
  personalized: boolean;
  tone: "formal" | "casual" | "encouraging" | "neutral";
  language: string;
  feedbackTemplates: {
    [questionType: string]: {
      correct: string[];
      incorrect: string[];
      partialCredit: string[];
    };
  };
}

/**
 * Feedback Item
 */
interface FeedbackItem {
  type: "general" | "question-specific" | "improvement" | "encouragement" | "resource";
  content: string;
  priority: "high" | "medium" | "low";
  questionId?: string;
  suggestedResources?: Array<{
    title: string;
    url: string;
    type: "video" | "article" | "exercise" | "reference";
  }>;
}

/**
 * Student Performance Profile
 */
interface StudentProfile {
  studentId: string;
  strengths: string[];
  weaknesses: string[];
  learningStyle: "visual" | "auditory" | "kinesthetic" | "mixed";
  performanceHistory: Array<{
    assignmentId: string;
    score: number;
    topicAreas: { [topic: string]: number };
  }>;
  engagementMetrics: {
    submissionTiming: "early" | "onTime" | "late";
    revisionCount: number;
    timeSpent: number;
  };
}

/**
 * Default feedback templates
 */
const DEFAULT_FEEDBACK_TEMPLATES = {
  MULTIPLE_CHOICE: {
    correct: [
      "Excellent! You selected the correct answer.",
      "Well done! That's the right choice.",
      "Perfect! You demonstrated good understanding."
    ],
    incorrect: [
      "Not quite right. The correct answer is: {correctAnswer}. {explanation}",
      "That's not correct. Consider reviewing the concept of {topic}.",
      "Close, but the correct answer is {correctAnswer}. Here's why: {explanation}"
    ],
    partialCredit: []
  },
  SHORT_ANSWER: {
    correct: [
      "Excellent response! You captured the key concepts clearly.",
      "Great work! Your answer demonstrates solid understanding.",
      "Perfect! You explained this concept very well."
    ],
    incorrect: [
      "Your response shows some understanding, but there are key points missing. {explanation}",
      "This needs more development. Consider including: {missingElements}",
      "You're on the right track, but the complete answer should include: {keyPoints}"
    ],
    partialCredit: [
      "Good start! You got {correctElements} right. To improve, focus on: {improvementAreas}",
      "You're partially correct. You understood {strengths} well, but consider reviewing {weaknesses}",
      "Nice work on {positiveAspects}. For full credit, also include: {missingElements}"
    ]
  },
  ESSAY: {
    correct: [
      "Outstanding essay! You demonstrated excellent critical thinking and writing skills.",
      "Excellent work! Your arguments are well-developed and clearly presented.",
      "Superb! You showed deep understanding and excellent analysis."
    ],
    incorrect: [
      "Your essay shows effort, but needs development in several areas: {improvementAreas}",
      "There's room for improvement in your analysis. Focus on: {keyAreas}",
      "Consider strengthening your argument by addressing: {missingElements}"
    ],
    partialCredit: [
      "Good essay with strong {strengths}. To improve, work on: {improvementAreas}",
      "You made some excellent points about {positiveAspects}. Consider expanding on: {developmentAreas}",
      "Solid foundation! Strengthen your response by addressing: {enhancementSuggestions}"
    ]
  },
  NUMERIC: {
    correct: [
      "Correct! You solved this problem accurately.",
      "Perfect calculation! Well done.",
      "Excellent! Your mathematical reasoning is spot-on."
    ],
    incorrect: [
      "The calculation isn't quite right. The correct answer is {correctAnswer}. Check your {errorType}.",
      "Close, but there's an error in your {step}. The correct result is {correctAnswer}.",
      "Not correct. Review the formula for {concept} and try again."
    ],
    partialCredit: [
      "Good approach! Your method is correct, but there's a calculation error in {step}.",
      "You're using the right strategy. Double-check your {errorLocation}.",
      "Excellent problem-solving approach! Just review your {calculationStep}."
    ]
  }
};

/**
 * Configure feedback system for an assignment
 */
export const configureFeedbackSystem = mutation({
  args: {
    assignmentId: v.id("assignments"),
    config: v.object({
      enabled: v.boolean(),
      feedbackStyle: v.union(v.literal("constructive"), v.literal("detailed"), v.literal("brief"), v.literal("encouraging")),
      includeCorrectAnswers: v.boolean(),
      includeHints: v.boolean(),
      includeResources: v.boolean(),
      personalized: v.boolean(),
      tone: v.union(v.literal("formal"), v.literal("casual"), v.literal("encouraging"), v.literal("neutral")),
      language: v.string()
    })
  },
  handler: async (ctx, args) => {
    const gradingConfig = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .first();

    if (!gradingConfig) {
      throw new Error("Grading configuration not found");
    }

    const feedbackConfig: FeedbackConfig = {
      ...args.config,
      feedbackTemplates: DEFAULT_FEEDBACK_TEMPLATES
    };

    await ctx.db.patch(gradingConfig._id, {
      feedbackConfig,
      lastUpdated: Date.now()
    });

    return {
      success: true,
      message: "Feedback system configured successfully"
    };
  }
});

/**
 * Generate comprehensive feedback for a submission
 */
export const generateSubmissionFeedback = action({
  args: {
    submissionId: v.id("submissions"),
    options: v.optional(v.object({
      includeStudentProfile: v.optional(v.boolean()),
      customFeedbackConfig: v.optional(v.any())
    }))
  },
  handler: async (ctx, args) => {
    const submission = await ctx.runQuery(api.autograding.getSubmissionDetails, {
      submissionId: args.submissionId
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    const gradingConfig = await ctx.runQuery(api.autograding.getGradingConfig, {
      assignmentId: submission.assignmentId
    });

    if (!gradingConfig) {
      throw new Error("Grading configuration not found");
    }

    const feedbackConfig = args.options?.customFeedbackConfig || gradingConfig.feedbackConfig;

    if (!feedbackConfig?.enabled) {
      return {
        enabled: false,
        message: "Feedback generation is not enabled for this assignment"
      };
    }

    // Get student profile if personalization is enabled
    let studentProfile: StudentProfile | null = null;
    if (feedbackConfig.personalized && args.options?.includeStudentProfile) {
      studentProfile = await ctx.runQuery(api.feedbackSystem.getStudentProfile, {
        studentId: submission.studentId
      });
    }

    // Generate feedback for each response
    const questionFeedback = await Promise.all(
      submission.responses.map(async (response) => {
        const question = gradingConfig.questions.find(q => q.questionId === response.questionId);
        if (!question) return null;

        return await generateQuestionFeedback(response, question, feedbackConfig, studentProfile);
      })
    );

    // Generate overall submission feedback
    const overallFeedback = generateOverallFeedback(
      submission,
      gradingConfig,
      feedbackConfig,
      studentProfile
    );

    // Compile final feedback
    const finalFeedback = {
      submissionId: args.submissionId,
      overallScore: submission.totalScore || 0,
      maxPoints: submission.totalPossible || 0,
      percentage: submission.percentageScore || 0,
      overallFeedback,
      questionFeedback: questionFeedback.filter(f => f !== null),
      improvementSuggestions: generateImprovementSuggestions(submission, gradingConfig, studentProfile),
      resources: feedbackConfig.includeResources ? generateResourceRecommendations(submission, gradingConfig) : [],
      generatedAt: Date.now(),
      feedbackStyle: feedbackConfig.feedbackStyle,
      personalized: feedbackConfig.personalized && studentProfile !== null
    };

    // Store feedback
    await ctx.runMutation(api.feedbackSystem.storeFeedback, {
      submissionId: args.submissionId,
      feedback: finalFeedback
    });

    return finalFeedback;
  }
});

/**
 * Generate feedback for a specific question response
 */
async function generateQuestionFeedback(
  response: any,
  question: any,
  config: FeedbackConfig,
  studentProfile: StudentProfile | null
): Promise<FeedbackItem | null> {
  const gradingResult = response.aiGradingResult || response.gradingResults?.find((gr: any) => gr.questionId === response.questionId);

  if (!gradingResult) {
    return null;
  }

  const templates = config.feedbackTemplates[question.questionType] || config.feedbackTemplates.SHORT_ANSWER;
  let feedbackTemplate: string;

  // Select appropriate feedback template
  if (gradingResult.isCorrect || gradingResult.confidence > 0.9) {
    feedbackTemplate = templates.correct[Math.floor(Math.random() * templates.correct.length)];
  } else if (gradingResult.pointsEarned > 0) {
    feedbackTemplate = templates.partialCredit[Math.floor(Math.random() * templates.partialCredit.length)] || templates.incorrect[0];
  } else {
    feedbackTemplate = templates.incorrect[Math.floor(Math.random() * templates.incorrect.length)];
  }

  // Customize feedback based on config and student profile
  let customizedFeedback = feedbackTemplate
    .replace("{correctAnswer}", question.correctAnswer || "")
    .replace("{explanation}", question.explanation || "")
    .replace("{topic}", question.topic || "this concept");

  // Add personalization if enabled
  if (config.personalized && studentProfile) {
    customizedFeedback = personalizeMessage(customizedFeedback, studentProfile, config.tone);
  }

  return {
    type: "question-specific",
    content: customizedFeedback,
    priority: gradingResult.isCorrect ? "low" : "high",
    questionId: response.questionId
  };
}

/**
 * Generate overall submission feedback
 */
function generateOverallFeedback(
  submission: any,
  gradingConfig: any,
  feedbackConfig: FeedbackConfig,
  studentProfile: StudentProfile | null
): FeedbackItem {
  const percentage = submission.percentageScore || 0;
  let message = "";

  // Base message based on performance
  if (percentage >= 90) {
    message = "Outstanding work! You demonstrated excellent understanding across all areas.";
  } else if (percentage >= 80) {
    message = "Great job! You showed strong comprehension with just a few areas for improvement.";
  } else if (percentage >= 70) {
    message = "Good work! You understand the key concepts but there are some areas to strengthen.";
  } else if (percentage >= 60) {
    message = "You're making progress! Focus on the feedback below to improve your understanding.";
  } else {
    message = "This assignment shows you're working hard. Use the feedback to guide your continued learning.";
  }

  // Add personalization
  if (feedbackConfig.personalized && studentProfile) {
    message = personalizeMessage(message, studentProfile, feedbackConfig.tone);
  }

  return {
    type: "general",
    content: message,
    priority: "high"
  };
}

/**
 * Generate improvement suggestions
 */
function generateImprovementSuggestions(
  submission: any,
  gradingConfig: any,
  studentProfile: StudentProfile | null
): FeedbackItem[] {
  const suggestions: FeedbackItem[] = [];

  // Analyze performance by question type
  const performanceByType = new Map<string, { correct: number; total: number }>();

  submission.responses.forEach((response: any) => {
    const question = gradingConfig.questions.find((q: any) => q.questionId === response.questionId);
    if (!question) return;

    const current = performanceByType.get(question.questionType) || { correct: 0, total: 0 };
    const gradingResult = response.gradingResults?.find((gr: any) => gr.questionId === response.questionId);

    current.total++;
    if (gradingResult?.isCorrect) {
      current.correct++;
    }

    performanceByType.set(question.questionType, current);
  });

  // Generate suggestions based on performance gaps
  performanceByType.forEach((stats, questionType) => {
    const accuracy = stats.correct / stats.total;
    if (accuracy < 0.7 && stats.total > 1) {
      suggestions.push({
        type: "improvement",
        content: `Consider reviewing ${questionType.toLowerCase().replace('_', ' ')} questions. Practice with similar problems to improve accuracy.`,
        priority: "high"
      });
    }
  });

  // Add personalized suggestions if profile available
  if (studentProfile && studentProfile.weaknesses.length > 0) {
    suggestions.push({
      type: "improvement",
      content: `Based on your learning profile, focus extra attention on: ${studentProfile.weaknesses.join(', ')}.`,
      priority: "medium"
    });
  }

  return suggestions;
}

/**
 * Generate resource recommendations
 */
function generateResourceRecommendations(submission: any, gradingConfig: any): FeedbackItem[] {
  const resources: FeedbackItem[] = [];

  // This would be enhanced with actual resource database
  const sampleResources = [
    {
      title: "Review Practice Problems",
      url: "/practice/problems",
      type: "exercise" as const
    },
    {
      title: "Concept Review Video",
      url: "/videos/concept-review",
      type: "video" as const
    },
    {
      title: "Study Guide",
      url: "/guides/study-guide",
      type: "reference" as const
    }
  ];

  resources.push({
    type: "resource",
    content: "Here are some resources to help you improve:",
    priority: "medium",
    suggestedResources: sampleResources
  });

  return resources;
}

/**
 * Personalize message based on student profile
 */
function personalizeMessage(message: string, profile: StudentProfile, tone: string): string {
  let personalizedMessage = message;

  // Add tone adjustments
  switch (tone) {
    case "encouraging":
      personalizedMessage = personalizedMessage.replace(/\.$/, "! Keep up the great effort!");
      break;
    case "casual":
      personalizedMessage = personalizedMessage.replace(/You/, "You're doing").replace(/\.$/, ".");
      break;
    case "formal":
      personalizedMessage = "Your submission " + personalizedMessage.toLowerCase();
      break;
  }

  // Add learning style hints
  if (profile.learningStyle === "visual") {
    personalizedMessage += " Try using diagrams or visual aids to reinforce these concepts.";
  } else if (profile.learningStyle === "auditory") {
    personalizedMessage += " Consider discussing these concepts aloud or listening to educational content.";
  }

  return personalizedMessage;
}

/**
 * Store generated feedback
 */
export const storeFeedback = mutation({
  args: {
    submissionId: v.id("submissions"),
    feedback: v.any()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      generatedFeedback: args.feedback,
      feedbackGeneratedAt: Date.now()
    });

    return {
      success: true,
      feedbackId: `feedback_${args.submissionId}_${Date.now()}`
    };
  }
});

/**
 * Get student profile for personalization
 */
export const getStudentProfile = query({
  args: {
    studentId: v.string()
  },
  handler: async (ctx, args) => {
    // Get recent submissions for this student
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .take(10);

    if (submissions.length === 0) {
      return null;
    }

    // Analyze performance patterns
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const performanceHistory: StudentProfile["performanceHistory"] = [];

    submissions.forEach(submission => {
      const score = submission.percentageScore || 0;

      performanceHistory.push({
        assignmentId: submission.assignmentId,
        score,
        topicAreas: {} // Would be populated with actual topic analysis
      });

      // Simple strength/weakness analysis based on scores
      if (score >= 80) {
        strengths.push("Strong overall performance");
      } else if (score < 60) {
        weaknesses.push("Needs improvement in core concepts");
      }
    });

    const profile: StudentProfile = {
      studentId: args.studentId,
      strengths: [...new Set(strengths)],
      weaknesses: [...new Set(weaknesses)],
      learningStyle: "mixed", // Would be determined through analysis
      performanceHistory,
      engagementMetrics: {
        submissionTiming: "onTime", // Would be calculated
        revisionCount: 0,
        timeSpent: 0
      }
    };

    return profile;
  }
});

/**
 * Get feedback for a submission
 */
export const getSubmissionFeedback = query({
  args: {
    submissionId: v.id("submissions")
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      return null;
    }

    return submission.generatedFeedback || null;
  }
});

/**
 * Batch generate feedback for multiple submissions
 */
export const batchGenerateFeedback = action({
  args: {
    assignmentId: v.id("assignments"),
    submissionIds: v.optional(v.array(v.id("submissions"))),
    options: v.optional(v.object({
      maxConcurrency: v.optional(v.number()),
      includePersonalization: v.optional(v.boolean())
    }))
  },
  handler: async (ctx, args) => {
    const options = args.options || {};
    const maxConcurrency = options.maxConcurrency || 5;

    // Get submissions to process
    let submissions;
    if (args.submissionIds) {
      submissions = args.submissionIds.map(id => ({ _id: id }));
    } else {
      submissions = await ctx.runQuery(api.autograding.getSubmissions, {
        assignmentId: args.assignmentId,
        courseId: "all" // This would need proper course ID
      });
    }

    const results = [];

    // Process in batches
    for (let i = 0; i < submissions.length; i += maxConcurrency) {
      const batch = submissions.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (submission) => {
        try {
          const feedback = await ctx.runAction(api.feedbackSystem.generateSubmissionFeedback, {
            submissionId: submission._id,
            options: {
              includeStudentProfile: options.includePersonalization
            }
          });

          return {
            submissionId: submission._id,
            success: true,
            feedback
          };
        } catch (error) {
          return {
            submissionId: submission._id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      });

      // Small delay between batches
      if (i + maxConcurrency < submissions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      totalSubmissions: submissions.length,
      successful,
      failed,
      successRate: submissions.length > 0 ? (successful / submissions.length) * 100 : 0,
      results
    };
  }
});

/**
 * Get feedback analytics for an assignment
 */
export const getFeedbackAnalytics = query({
  args: {
    assignmentId: v.id("assignments")
  },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const submissionsWithFeedback = submissions.filter(s => s.generatedFeedback);

    if (submissionsWithFeedback.length === 0) {
      return {
        totalSubmissions: submissions.length,
        feedbackGenerated: 0,
        averageFeedbackLength: 0,
        feedbackTypes: {},
        studentEngagement: {}
      };
    }

    const analytics = {
      totalSubmissions: submissions.length,
      feedbackGenerated: submissionsWithFeedback.length,
      averageFeedbackLength: 0,
      feedbackTypes: {} as Record<string, number>,
      studentEngagement: {
        viewed: 0,
        actedUpon: 0
      }
    };

    let totalFeedbackLength = 0;

    submissionsWithFeedback.forEach(submission => {
      const feedback = submission.generatedFeedback;
      if (feedback) {
        // Calculate feedback length
        const feedbackText = feedback.overallFeedback?.content || "";
        totalFeedbackLength += feedbackText.length;

        // Count feedback types
        feedback.questionFeedback?.forEach((item: any) => {
          analytics.feedbackTypes[item.type] = (analytics.feedbackTypes[item.type] || 0) + 1;
        });
      }
    });

    analytics.averageFeedbackLength = totalFeedbackLength / submissionsWithFeedback.length;

    return analytics;
  }
});