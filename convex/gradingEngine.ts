import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// ADVANCED AUTOGRADING ENGINE
// ============================================

/**
 * Grading Rules Interface - Defines how different question types should be graded
 */
interface GradingRule {
  questionType: string;
  algorithm: string;
  parameters: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
    partialCredit?: boolean;
    maxPartialPercent?: number;
    synonymAccepted?: boolean;
    numericTolerance?: number;
    unitRequired?: boolean;
    keywordWeights?: { [keyword: string]: number };
    minimumWords?: number;
    maximumWords?: number;
  };
}

/**
 * Advanced grading algorithms for different question types
 */
class AutoGradingEngine {
  /**
   * Grade a multiple choice question
   */
  static gradeMultipleChoice(
    studentAnswer: string,
    correctAnswer: string,
    parameters: GradingRule["parameters"]
  ): { score: number; feedback: string; isCorrect: boolean } {
    const caseSensitive = parameters.caseSensitive ?? false;

    let studentAns = caseSensitive ? studentAnswer : studentAnswer.toLowerCase();
    let correctAns = caseSensitive ? correctAnswer : correctAnswer.toLowerCase();

    const isCorrect = studentAns === correctAns;

    return {
      score: isCorrect ? 1 : 0,
      feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${correctAnswer}`,
      isCorrect
    };
  }

  /**
   * Grade a checkbox/multiple select question
   */
  static gradeCheckbox(
    studentAnswers: string[],
    correctAnswers: string[],
    parameters: GradingRule["parameters"]
  ): { score: number; feedback: string; isCorrect: boolean } {
    const caseSensitive = parameters.caseSensitive ?? false;
    const partialCredit = parameters.partialCredit ?? false;
    const maxPartial = parameters.maxPartialPercent ?? 0.5;

    const normalizeArray = (arr: string[]) =>
      caseSensitive ? arr : arr.map(a => a.toLowerCase());

    const studentSet = new Set(normalizeArray(studentAnswers));
    const correctSet = new Set(normalizeArray(correctAnswers));

    let correctMatches = 0;
    let incorrectSelections = 0;

    // Count correct matches
    for (const answer of Array.from(studentSet)) {
      if (correctSet.has(answer)) {
        correctMatches++;
      } else {
        incorrectSelections++;
      }
    }

    // Count missed correct answers
    const missedAnswers = correctAnswers.length - correctMatches;

    let score = 0;
    let feedback = "";
    const isFullyCorrect = correctMatches === correctAnswers.length && incorrectSelections === 0;

    if (isFullyCorrect) {
      score = 1;
      feedback = "Correct! All answers selected properly.";
    } else if (partialCredit && correctMatches > 0) {
      // Partial credit: (correct - incorrect) / total possible, minimum 0
      const partialScore = Math.max(0, (correctMatches - incorrectSelections) / correctAnswers.length);
      score = Math.min(partialScore, maxPartial);
      feedback = `Partial credit: ${correctMatches} correct, ${incorrectSelections} incorrect, ${missedAnswers} missed.`;
    } else {
      score = 0;
      feedback = `Incorrect. You selected ${correctMatches} correct answer(s) but also ${incorrectSelections} incorrect selection(s).`;
    }

    return { score, feedback, isCorrect: isFullyCorrect };
  }

  /**
   * Grade a short answer question with advanced text matching
   */
  static gradeShortAnswer(
    studentAnswer: string,
    correctAnswer: string,
    parameters: GradingRule["parameters"]
  ): { score: number; feedback: string; isCorrect: boolean } {
    const caseSensitive = parameters.caseSensitive ?? false;
    const exactMatch = parameters.exactMatch ?? false;
    const partialCredit = parameters.partialCredit ?? true;
    const maxPartial = parameters.maxPartialPercent ?? 0.7;
    const synonymAccepted = parameters.synonymAccepted ?? false;

    let studentAns = caseSensitive ? studentAnswer.trim() : studentAnswer.toLowerCase().trim();
    let correctAns = caseSensitive ? correctAnswer.trim() : correctAnswer.toLowerCase().trim();

    // Exact match check
    if (studentAns === correctAns) {
      return {
        score: 1,
        feedback: "Correct!",
        isCorrect: true
      };
    }

    if (exactMatch) {
      return {
        score: 0,
        feedback: `Incorrect. Expected exact answer: "${correctAnswer}"`,
        isCorrect: false
      };
    }

    // Partial matching for non-exact answers
    if (partialCredit) {
      const similarity = this.calculateTextSimilarity(studentAns, correctAns);

      if (similarity > 0.8) {
        return {
          score: maxPartial,
          feedback: `Close answer. Some minor differences detected.`,
          isCorrect: false
        };
      } else if (similarity > 0.5) {
        return {
          score: maxPartial * 0.5,
          feedback: `Partially correct. The answer contains some correct elements.`,
          isCorrect: false
        };
      }
    }

    return {
      score: 0,
      feedback: `Incorrect. Expected: "${correctAnswer}"`,
      isCorrect: false
    };
  }

  /**
   * Grade a numeric answer with tolerance
   */
  static gradeNumeric(
    studentAnswer: string,
    correctAnswer: string,
    parameters: GradingRule["parameters"]
  ): { score: number; feedback: string; isCorrect: boolean } {
    const tolerance = parameters.numericTolerance ?? 0.01;
    const unitRequired = parameters.unitRequired ?? false;

    // Extract number and unit from answers
    const studentParsed = this.parseNumericAnswer(studentAnswer);
    const correctParsed = this.parseNumericAnswer(correctAnswer);

    if (!studentParsed.isValid || !correctParsed.isValid) {
      return {
        score: 0,
        feedback: "Invalid numeric format. Please enter a valid number.",
        isCorrect: false
      };
    }

    // Check unit if required
    if (unitRequired && studentParsed.unit !== correctParsed.unit) {
      return {
        score: 0,
        feedback: `Incorrect unit. Expected: ${correctParsed.unit}, Got: ${studentParsed.unit}`,
        isCorrect: false
      };
    }

    // Check numeric value within tolerance
    const difference = Math.abs(studentParsed.value - correctParsed.value);
    const maxAllowedDifference = Math.abs(correctParsed.value * tolerance);

    const isCorrect = difference <= maxAllowedDifference;

    return {
      score: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? "Correct!"
        : `Incorrect. Expected: ${correctAnswer}, Got: ${studentAnswer}`,
      isCorrect
    };
  }

  /**
   * Grade an essay/long answer using keyword analysis
   */
  static gradeEssay(
    studentAnswer: string,
    keywordsAndWeights: { [keyword: string]: number },
    parameters: GradingRule["parameters"]
  ): { score: number; feedback: string; isCorrect: boolean } {
    const minWords = parameters.minimumWords ?? 50;
    const maxWords = parameters.maximumWords ?? 1000;
    const caseSensitive = parameters.caseSensitive ?? false;

    const text = caseSensitive ? studentAnswer : studentAnswer.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 0);

    // Check word count requirements
    if (words.length < minWords) {
      return {
        score: 0,
        feedback: `Answer too short. Minimum ${minWords} words required, got ${words.length}.`,
        isCorrect: false
      };
    }

    if (words.length > maxWords) {
      return {
        score: 0.8, // Slight penalty for being too verbose
        feedback: `Answer exceeds maximum length. Maximum ${maxWords} words allowed, got ${words.length}.`,
        isCorrect: false
      };
    }

    // Calculate score based on keyword presence
    let totalScore = 0;
    let maxPossibleScore = 0;
    const foundKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const [keyword, weight] of Object.entries(keywordsAndWeights)) {
      maxPossibleScore += weight;
      const keywordToFind = caseSensitive ? keyword : keyword.toLowerCase();

      if (text.includes(keywordToFind)) {
        totalScore += weight;
        foundKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    }

    const finalScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    let feedback = `Found ${foundKeywords.length}/${Object.keys(keywordsAndWeights).length} key concepts.`;
    if (missingKeywords.length > 0) {
      feedback += ` Missing: ${missingKeywords.join(', ')}.`;
    }

    return {
      score: finalScore,
      feedback,
      isCorrect: finalScore >= 0.8
    };
  }

  /**
   * Calculate text similarity using Levenshtein distance
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const matrix = Array(text2.length + 1).fill(null).map(() => Array(text1.length + 1).fill(null));

    for (let i = 0; i <= text1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= text2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= text2.length; j++) {
      for (let i = 1; i <= text1.length; i++) {
        const indicator = text1[i - 1] === text2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = matrix[text2.length][text1.length];
    const maxLength = Math.max(text1.length, text2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Parse numeric answer to extract value and unit
   */
  private static parseNumericAnswer(answer: string): { value: number; unit: string; isValid: boolean } {
    const trimmed = answer.trim();

    // Match number followed by optional unit
    const match = trimmed.match(/^(-?\d*\.?\d+)\s*([a-zA-Z%°]*)?$/);

    if (!match) {
      return { value: 0, unit: "", isValid: false };
    }

    const value = parseFloat(match[1]);
    const unit = match[2] || "";

    return {
      value: isNaN(value) ? 0 : value,
      unit: unit.toLowerCase(),
      isValid: !isNaN(value)
    };
  }
}

/**
 * Enhanced auto-grade submission with advanced algorithms
 */
export const enhancedAutoGradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    gradingRules: v.optional(v.array(v.object({
      questionId: v.string(),
      algorithm: v.string(),
      parameters: v.object({
        caseSensitive: v.optional(v.boolean()),
        exactMatch: v.optional(v.boolean()),
        partialCredit: v.optional(v.boolean()),
        maxPartialPercent: v.optional(v.number()),
        synonymAccepted: v.optional(v.boolean()),
        numericTolerance: v.optional(v.number()),
        unitRequired: v.optional(v.boolean()),
        keywordWeights: v.optional(v.record(v.string(), v.number())),
        minimumWords: v.optional(v.number()),
        maximumWords: v.optional(v.number()),
      })
    })))
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Get grading configuration
    const gradingConfig = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", submission.assignmentId))
      .first();

    if (!gradingConfig || !gradingConfig.autoGradingEnabled) {
      throw new Error("Auto-grading not enabled for this assignment");
    }

    let totalScore = 0;
    const gradingResults = submission.responses.map((response, index) => {
      const question = gradingConfig.questions.find(q => q.questionId === response.questionId);
      if (!question) {
        return {
          questionId: response.questionId,
          isCorrect: false,
          pointsEarned: 0,
          pointsPossible: 0,
          feedback: "Question not found in grading configuration",
          algorithm: "none"
        };
      }

      // Get custom grading rule for this question or use default
      const customRule = args.gradingRules?.find(rule => rule.questionId === response.questionId);

      let gradingResult;
      const responseText = Array.isArray(response.response) ? response.response[0] : response.response;

      switch (question.questionType) {
        case "MULTIPLE_CHOICE":
          gradingResult = AutoGradingEngine.gradeMultipleChoice(
            responseText,
            question.correctAnswer || "",
            customRule?.parameters || {}
          );
          break;

        case "CHECKBOX":
          const responseArray = Array.isArray(response.response) ? response.response : [response.response];
          const correctArray = question.correctAnswer ? question.correctAnswer.split(',').map(s => s.trim()) : [];
          gradingResult = AutoGradingEngine.gradeCheckbox(
            responseArray,
            correctArray,
            customRule?.parameters || { partialCredit: true }
          );
          break;

        case "SHORT_ANSWER":
          gradingResult = AutoGradingEngine.gradeShortAnswer(
            responseText,
            question.correctAnswer || "",
            customRule?.parameters || { partialCredit: true, exactMatch: false }
          );
          break;

        case "NUMERIC":
          gradingResult = AutoGradingEngine.gradeNumeric(
            responseText,
            question.correctAnswer || "",
            customRule?.parameters || { numericTolerance: 0.01 }
          );
          break;

        case "PARAGRAPH":
        case "ESSAY":
          // Use keyword-based grading for essays
          const keywords = customRule?.parameters?.keywordWeights || {};
          gradingResult = AutoGradingEngine.gradeEssay(
            responseText,
            keywords,
            customRule?.parameters || { minimumWords: 50 }
          );
          break;

        default:
          // Default: award full points for any response
          gradingResult = {
            score: 1,
            feedback: "Response recorded",
            isCorrect: true
          };
      }

      const pointsEarned = gradingResult.score * question.points;
      totalScore += pointsEarned;

      return {
        questionId: response.questionId,
        isCorrect: gradingResult.isCorrect,
        pointsEarned,
        pointsPossible: question.points,
        feedback: gradingResult.feedback,
        algorithm: question.questionType,
        confidence: gradingResult.score // Add confidence score
      };
    });

    // Update submission with enhanced grading results
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
      questionsGraded: gradingResults.length,
      gradingDetails: gradingResults
    };
  },
});

/**
 * Get available grading algorithms and their parameters
 */
export const getGradingAlgorithms = query({
  args: {},
  handler: async (ctx, args) => {
    return {
      algorithms: [
        {
          type: "MULTIPLE_CHOICE",
          name: "Multiple Choice Grading",
          description: "Exact match grading for single-select questions",
          parameters: [
            { name: "caseSensitive", type: "boolean", default: false, description: "Whether the comparison should be case sensitive" }
          ]
        },
        {
          type: "CHECKBOX",
          name: "Multiple Select Grading",
          description: "Grading for multiple selection questions with partial credit",
          parameters: [
            { name: "partialCredit", type: "boolean", default: true, description: "Allow partial credit for partially correct answers" },
            { name: "maxPartialPercent", type: "number", default: 0.5, description: "Maximum partial credit as percentage" },
            { name: "caseSensitive", type: "boolean", default: false, description: "Whether the comparison should be case sensitive" }
          ]
        },
        {
          type: "SHORT_ANSWER",
          name: "Short Answer Grading",
          description: "Text-based grading with similarity matching",
          parameters: [
            { name: "exactMatch", type: "boolean", default: false, description: "Require exact text match" },
            { name: "partialCredit", type: "boolean", default: true, description: "Allow partial credit for similar answers" },
            { name: "maxPartialPercent", type: "number", default: 0.7, description: "Maximum partial credit as percentage" },
            { name: "caseSensitive", type: "boolean", default: false, description: "Whether the comparison should be case sensitive" }
          ]
        },
        {
          type: "NUMERIC",
          name: "Numeric Answer Grading",
          description: "Grading for numeric answers with tolerance",
          parameters: [
            { name: "numericTolerance", type: "number", default: 0.01, description: "Tolerance as percentage (0.01 = 1%)" },
            { name: "unitRequired", type: "boolean", default: false, description: "Whether units must match exactly" }
          ]
        },
        {
          type: "ESSAY",
          name: "Essay/Keyword Grading",
          description: "Keyword-based grading for long-form answers",
          parameters: [
            { name: "keywordWeights", type: "object", default: {}, description: "Keywords and their weights as key-value pairs" },
            { name: "minimumWords", type: "number", default: 50, description: "Minimum word count required" },
            { name: "maximumWords", type: "number", default: 1000, description: "Maximum word count allowed" },
            { name: "caseSensitive", type: "boolean", default: false, description: "Whether keyword matching should be case sensitive" }
          ]
        }
      ]
    };
  },
});

/**
 * Preview grading results without saving
 */
export const previewGrading = query({
  args: {
    submissionId: v.id("submissions"),
    gradingRules: v.optional(v.array(v.object({
      questionId: v.string(),
      algorithm: v.string(),
      parameters: v.object({
        caseSensitive: v.optional(v.boolean()),
        exactMatch: v.optional(v.boolean()),
        partialCredit: v.optional(v.boolean()),
        maxPartialPercent: v.optional(v.number()),
        numericTolerance: v.optional(v.number()),
        keywordWeights: v.optional(v.record(v.string(), v.number())),
        minimumWords: v.optional(v.number()),
      })
    })))
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      return null;
    }

    const gradingConfig = await ctx.db
      .query("gradingConfigs")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", submission.assignmentId))
      .first();

    if (!gradingConfig) {
      return null;
    }

    // This would contain the same grading logic as enhancedAutoGradeSubmission
    // but without saving to database - just return the preview results
    return {
      submissionId: args.submissionId,
      currentGrading: submission.gradingResults || [],
      previewResults: [], // Would compute preview results here
      changes: [] // Would show what changes would be made
    };
  },
});