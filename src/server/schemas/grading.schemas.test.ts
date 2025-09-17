import { describe, it, expect } from 'vitest';
import {
  GradingMethodSchema,
  AIProviderSchema,
  GradingResultSchema,
  AIGradingConfigSchema,
  AIGradingRequestSchema,
  AIGradingResponseSchema,
  BatchGradingJobSchema,
  validateGradingResult,
  validateAIGradingRequest,
  validateBatchGradingJob,
  isValidGradingMethod,
  calculateGradeFromResults,
  needsHumanReview,
  estimateBatchGradingTime,
  calculateGradingCost,
  type GradingResult,
  type AIGradingRequest,
  type AIGradingResponse,
  type BatchGradingJob,
} from './grading.schemas';

describe('GradingMethodSchema', () => {
  it('should validate valid grading methods', () => {
    const validMethods = ['auto', 'manual', 'ai', 'hybrid'];
    validMethods.forEach(method => {
      expect(() => GradingMethodSchema.parse(method)).not.toThrow();
    });
  });

  it('should reject invalid grading methods', () => {
    const invalidMethods = ['automatic', 'AI', 'human', 'invalid'];
    invalidMethods.forEach(method => {
      expect(() => GradingMethodSchema.parse(method)).toThrow();
    });
  });
});

describe('AIProviderSchema', () => {
  it('should validate supported AI providers', () => {
    const validProviders = ['gemini', 'claude', 'openai'];
    validProviders.forEach(provider => {
      expect(() => AIProviderSchema.parse(provider)).not.toThrow();
    });
  });

  it('should reject unsupported AI providers', () => {
    const invalidProviders = ['anthropic', 'google', 'chatgpt', 'invalid'];
    invalidProviders.forEach(provider => {
      expect(() => AIProviderSchema.parse(provider)).toThrow();
    });
  });
});

describe('GradingResultSchema', () => {
  const validGradingResult: GradingResult = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    submissionId: '123e4567-e89b-12d3-a456-426614174001',
    questionId: 'question_123',
    method: 'ai',
    pointsEarned: 8.5,
    pointsPossible: 10,
    percentage: 85,
    isCorrect: true,
    confidence: 0.92,
    feedback: 'Excellent work with minor improvements needed.',
    reasoning: 'Answer demonstrates understanding of key concepts.',
    suggestions: ['Consider expanding on the conclusion'],
    gradedAt: 1705392000000,
    gradedBy: 'system',
    reviewedBy: 'teacher@school.edu',
    reviewedAt: 1705392300000,
    needsReview: false,
  };

  it('should validate a complete valid grading result', () => {
    expect(() => GradingResultSchema.parse(validGradingResult)).not.toThrow();
  });

  it('should require valid UUID for id and submissionId', () => {
    const invalidId = { ...validGradingResult, id: 'not-a-uuid' };
    expect(() => GradingResultSchema.parse(invalidId)).toThrow();

    const invalidSubmissionId = { ...validGradingResult, submissionId: 'not-a-uuid' };
    expect(() => GradingResultSchema.parse(invalidSubmissionId)).toThrow();
  });

  it('should enforce non-negative points constraints', () => {
    const negativeEarned = { ...validGradingResult, pointsEarned: -1 };
    expect(() => GradingResultSchema.parse(negativeEarned)).toThrow();

    const negativePossible = { ...validGradingResult, pointsPossible: -1 };
    expect(() => GradingResultSchema.parse(negativePossible)).toThrow();
  });

  it('should enforce percentage range 0-100', () => {
    const tooLow = { ...validGradingResult, percentage: -1 };
    expect(() => GradingResultSchema.parse(tooLow)).toThrow();

    const tooHigh = { ...validGradingResult, percentage: 101 };
    expect(() => GradingResultSchema.parse(tooHigh)).toThrow();

    const validRange = { ...validGradingResult, percentage: 85.5 };
    expect(() => GradingResultSchema.parse(validRange)).not.toThrow();
  });

  it('should enforce confidence range 0-1', () => {
    const tooLow = { ...validGradingResult, confidence: -0.1 };
    expect(() => GradingResultSchema.parse(tooLow)).toThrow();

    const tooHigh = { ...validGradingResult, confidence: 1.1 };
    expect(() => GradingResultSchema.parse(tooHigh)).toThrow();

    const validRange = { ...validGradingResult, confidence: 0.85 };
    expect(() => GradingResultSchema.parse(validRange)).not.toThrow();
  });

  it('should apply default values correctly', () => {
    const minimal = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      submissionId: '123e4567-e89b-12d3-a456-426614174001',
      questionId: 'question_123',
      method: 'auto' as const,
      pointsEarned: 10,
      pointsPossible: 10,
      percentage: 100,
      isCorrect: true,
      gradedAt: 1705392000000,
    };
    const parsed = GradingResultSchema.parse(minimal);
    expect(parsed.needsReview).toBe(false);
  });
});

describe('AIGradingConfigSchema', () => {
  it('should apply correct default values', () => {
    const minimal = {};
    const parsed = AIGradingConfigSchema.parse(minimal);

    expect(parsed.enabled).toBe(false);
    expect(parsed.provider).toBe('gemini');
    expect(parsed.model).toBe('gemini-pro');
    expect(parsed.maxTokens).toBe(1000);
    expect(parsed.temperature).toBe(0.1);
    expect(parsed.confidenceThreshold).toBe(0.7);
    expect(parsed.fallbackToAuto).toBe(true);
    expect(parsed.maxCostPerSubmission).toBe(0.10);
    expect(parsed.dailyBudget).toBe(50.00);
    expect(parsed.rateLimit.requestsPerMinute).toBe(60);
    expect(parsed.rateLimit.requestsPerHour).toBe(1000);
  });

  it('should enforce temperature range 0-2', () => {
    const tooLow = { temperature: -0.1 };
    expect(() => AIGradingConfigSchema.parse(tooLow)).toThrow();

    const tooHigh = { temperature: 2.1 };
    expect(() => AIGradingConfigSchema.parse(tooHigh)).toThrow();

    const validRange = { temperature: 1.5 };
    expect(() => AIGradingConfigSchema.parse(validRange)).not.toThrow();
  });

  it('should enforce confidence threshold range 0-1', () => {
    const tooLow = { confidenceThreshold: -0.1 };
    expect(() => AIGradingConfigSchema.parse(tooLow)).toThrow();

    const tooHigh = { confidenceThreshold: 1.1 };
    expect(() => AIGradingConfigSchema.parse(tooHigh)).toThrow();
  });

  it('should enforce positive costs and rate limits', () => {
    const negativeCost = { maxCostPerSubmission: -0.01 };
    expect(() => AIGradingConfigSchema.parse(negativeCost)).toThrow();

    const zeroBudget = { dailyBudget: 0 };
    expect(() => AIGradingConfigSchema.parse(zeroBudget)).toThrow();

    const negativeRate = { rateLimit: { requestsPerMinute: -1, requestsPerHour: 1000 } };
    expect(() => AIGradingConfigSchema.parse(negativeRate)).toThrow();
  });
});

describe('AIGradingRequestSchema', () => {
  const validRequest: AIGradingRequest = {
    submissionId: '123e4567-e89b-12d3-a456-426614174000',
    questionId: 'question_123',
    questionText: 'Explain the concept of photosynthesis.',
    questionType: 'SHORT_ANSWER',
    studentResponse: 'Photosynthesis is the process where plants convert sunlight into energy.',
    correctAnswer: 'Photosynthesis is the process by which plants use sunlight, water, and CO2 to produce glucose and oxygen.',
    rubric: 'Award full points for mentioning sunlight, water, CO2, glucose, and oxygen.',
    pointsPossible: 10,
    context: {
      subject: 'Biology',
      gradeLevel: '9th Grade',
      assignmentTitle: 'Plant Biology Unit Test',
      additionalInstructions: 'Focus on scientific accuracy.',
    },
    config: {
      provider: 'gemini',
      model: 'gemini-pro',
      maxTokens: 500,
    },
  };

  it('should validate a complete valid AI grading request', () => {
    expect(() => AIGradingRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('should require valid UUID for submissionId', () => {
    const invalid = { ...validRequest, submissionId: 'not-a-uuid' };
    expect(() => AIGradingRequestSchema.parse(invalid)).toThrow();
  });

  it('should validate question types', () => {
    const validTypes = ['SHORT_ANSWER', 'PARAGRAPH', 'MULTIPLE_CHOICE', 'CHECKBOX'];
    validTypes.forEach(type => {
      const valid = { ...validRequest, questionType: type as any };
      expect(() => AIGradingRequestSchema.parse(valid)).not.toThrow();
    });

    const invalid = { ...validRequest, questionType: 'INVALID_TYPE' };
    expect(() => AIGradingRequestSchema.parse(invalid)).toThrow();
  });

  it('should require non-empty questionText and studentResponse', () => {
    const emptyQuestion = { ...validRequest, questionText: '' };
    expect(() => AIGradingRequestSchema.parse(emptyQuestion)).toThrow();

    const emptyResponse = { ...validRequest, studentResponse: '' };
    expect(() => AIGradingRequestSchema.parse(emptyResponse)).not.toThrow(); // Empty responses are allowed
  });

  it('should enforce non-negative pointsPossible', () => {
    const negative = { ...validRequest, pointsPossible: -1 };
    expect(() => AIGradingRequestSchema.parse(negative)).toThrow();

    const zero = { ...validRequest, pointsPossible: 0 };
    expect(() => AIGradingRequestSchema.parse(zero)).not.toThrow();
  });
});

describe('AIGradingResponseSchema', () => {
  const validResponse: AIGradingResponse = {
    questionId: 'question_123',
    pointsEarned: 8.5,
    pointsPossible: 10,
    percentage: 85,
    isCorrect: true,
    confidence: 0.92,
    feedback: 'Good understanding shown, but could expand on the role of chlorophyll.',
    reasoning: 'Student correctly identified key components but missed chlorophyll detail.',
    suggestions: ['Mention chlorophyll', 'Describe the chemical equation'],
    processingTime: 1250,
    tokensUsed: 450,
    cost: 0.0045,
    model: 'gemini-pro',
    provider: 'gemini',
  };

  it('should validate a complete valid AI grading response', () => {
    expect(() => AIGradingResponseSchema.parse(validResponse)).not.toThrow();
  });

  it('should enforce positive processing time', () => {
    const invalid = { ...validResponse, processingTime: -1 };
    expect(() => AIGradingResponseSchema.parse(invalid)).toThrow();

    const zero = { ...validResponse, processingTime: 0 };
    expect(() => AIGradingResponseSchema.parse(zero)).toThrow();
  });

  it('should enforce non-negative tokens and cost', () => {
    const negativeTokens = { ...validResponse, tokensUsed: -1 };
    expect(() => AIGradingResponseSchema.parse(negativeTokens)).toThrow();

    const negativeCost = { ...validResponse, cost: -0.01 };
    expect(() => AIGradingResponseSchema.parse(negativeCost)).toThrow();

    const zeroValues = { ...validResponse, tokensUsed: 0, cost: 0 };
    expect(() => AIGradingResponseSchema.parse(zeroValues)).not.toThrow();
  });
});

describe('BatchGradingJobSchema', () => {
  const validJob: BatchGradingJob = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    assignmentId: '123e4567-e89b-12d3-a456-426614174001',
    userId: '123e4567-e89b-12d3-a456-426614174002',
    status: 'running',
    method: 'ai',
    settings: {
      batchSize: 10,
      maxConcurrency: 3,
      skipAlreadyGraded: true,
      retryFailedSubmissions: true,
      notifyOnCompletion: true,
      publishToClassroom: false,
    },
    progress: {
      totalSubmissions: 100,
      processedCount: 45,
      successCount: 42,
      failedCount: 3,
      currentBatch: 5,
      totalBatches: 10,
      percentage: 45,
    },
    timing: {
      startTime: 1705392000000,
      estimatedCompletion: 1705395600000,
      averageTimePerSubmission: 3000,
    },
    costs: {
      totalCost: 4.50,
      averageCostPerSubmission: 0.045,
      tokensUsed: 9000,
    },
    errors: [
      {
        submissionId: '123e4567-e89b-12d3-a456-426614174003',
        error: 'Network timeout',
        timestamp: 1705392300000,
        retryCount: 2,
      },
    ],
    createdAt: 1705391000000,
    updatedAt: 1705392000000,
  };

  it('should validate a complete valid batch grading job', () => {
    expect(() => BatchGradingJobSchema.parse(validJob)).not.toThrow();
  });

  it('should enforce batch size and concurrency limits', () => {
    const oversizedBatch = {
      ...validJob,
      settings: { ...validJob.settings, batchSize: 51 },
    };
    expect(() => BatchGradingJobSchema.parse(oversizedBatch)).toThrow();

    const overConcurrency = {
      ...validJob,
      settings: { ...validJob.settings, maxConcurrency: 11 },
    };
    expect(() => BatchGradingJobSchema.parse(overConcurrency)).toThrow();
  });

  it('should enforce valid status values', () => {
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    validStatuses.forEach(status => {
      const valid = { ...validJob, status: status as any };
      expect(() => BatchGradingJobSchema.parse(valid)).not.toThrow();
    });

    const invalid = { ...validJob, status: 'invalid' };
    expect(() => BatchGradingJobSchema.parse(invalid)).toThrow();
  });

  it('should enforce non-negative progress counts', () => {
    const negativeProgress = {
      ...validJob,
      progress: { ...validJob.progress, processedCount: -1 },
    };
    expect(() => BatchGradingJobSchema.parse(negativeProgress)).toThrow();
  });

  it('should enforce percentage range 0-100', () => {
    const invalidPercentage = {
      ...validJob,
      progress: { ...validJob.progress, percentage: 101 },
    };
    expect(() => BatchGradingJobSchema.parse(invalidPercentage)).toThrow();
  });
});

describe('Validation Helper Functions', () => {
  it('should validateGradingResult correctly', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      submissionId: '123e4567-e89b-12d3-a456-426614174001',
      questionId: 'question_123',
      method: 'auto',
      pointsEarned: 10,
      pointsPossible: 10,
      percentage: 100,
      isCorrect: true,
      gradedAt: 1705392000000,
    };
    expect(() => validateGradingResult(valid)).not.toThrow();
    expect(() => validateGradingResult({})).toThrow();
  });

  it('should isValidGradingMethod return boolean correctly', () => {
    expect(isValidGradingMethod('auto')).toBe(true);
    expect(isValidGradingMethod('manual')).toBe(true);
    expect(isValidGradingMethod('ai')).toBe(true);
    expect(isValidGradingMethod('hybrid')).toBe(true);
    expect(isValidGradingMethod('invalid')).toBe(false);
    expect(isValidGradingMethod('')).toBe(false);
  });
});

describe('Helper Functions', () => {
  describe('calculateGradeFromResults', () => {
    it('should calculate total grade correctly', () => {
      const results: GradingResult[] = [
        {
          id: '1',
          submissionId: '1',
          questionId: 'q1',
          method: 'auto',
          pointsEarned: 8,
          pointsPossible: 10,
          percentage: 80,
          isCorrect: true,
          gradedAt: Date.now(),
        },
        {
          id: '2',
          submissionId: '1',
          questionId: 'q2',
          method: 'auto',
          pointsEarned: 15,
          pointsPossible: 20,
          percentage: 75,
          isCorrect: true,
          gradedAt: Date.now(),
        },
      ];

      const grade = calculateGradeFromResults(results);
      expect(grade.totalPoints).toBe(23);
      expect(grade.maxPoints).toBe(30);
      expect(grade.percentage).toBeCloseTo(76.67, 2);
    });

    it('should handle empty results', () => {
      const grade = calculateGradeFromResults([]);
      expect(grade.totalPoints).toBe(0);
      expect(grade.maxPoints).toBe(0);
      expect(grade.percentage).toBe(0);
    });
  });

  describe('needsHumanReview', () => {
    it('should determine review necessity based on confidence', () => {
      const highConfidence: GradingResult = {
        id: '1',
        submissionId: '1',
        questionId: 'q1',
        method: 'ai',
        pointsEarned: 10,
        pointsPossible: 10,
        percentage: 100,
        isCorrect: true,
        confidence: 0.95,
        gradedAt: Date.now(),
      };

      const lowConfidence: GradingResult = {
        ...highConfidence,
        confidence: 0.5,
      };

      const noConfidence: GradingResult = {
        ...highConfidence,
        confidence: undefined,
      };

      expect(needsHumanReview(highConfidence)).toBe(false);
      expect(needsHumanReview(lowConfidence)).toBe(true);
      expect(needsHumanReview(noConfidence)).toBe(false);
      expect(needsHumanReview(lowConfidence, 0.3)).toBe(false);
    });
  });

  describe('estimateBatchGradingTime', () => {
    it('should estimate time based on method multipliers', () => {
      const baseTime = 1000; // 1 second per submission

      expect(estimateBatchGradingTime(10, 'auto', baseTime)).toBe(10000);
      expect(estimateBatchGradingTime(10, 'manual', baseTime)).toBe(100000);
      expect(estimateBatchGradingTime(10, 'ai', baseTime)).toBe(30000);
      expect(estimateBatchGradingTime(10, 'hybrid', baseTime)).toBe(50000);
    });
  });

  describe('calculateGradingCost', () => {
    it('should calculate costs for different providers and models', () => {
      expect(calculateGradingCost(1000, 'gemini', 'gemini-pro')).toBe(0.0005);
      expect(calculateGradingCost(1000, 'claude', 'claude-3-sonnet')).toBe(0.003);
      expect(calculateGradingCost(1000, 'openai', 'gpt-4')).toBe(0.03);
      expect(calculateGradingCost(1000, 'openai', 'gpt-3.5-turbo')).toBe(0.002);
    });

    it('should use default cost for unknown models', () => {
      expect(calculateGradingCost(1000, 'gemini', 'unknown-model')).toBe(0.001);
      expect(calculateGradingCost(1000, 'unknown-provider' as any, 'any-model')).toBe(0.001);
    });

    it('should scale with token usage', () => {
      expect(calculateGradingCost(2000, 'gemini', 'gemini-pro')).toBe(0.001);
      expect(calculateGradingCost(500, 'gemini', 'gemini-pro')).toBe(0.00025);
    });
  });
});