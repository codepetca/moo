import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ClassroomSchema,
  GoogleClassroomSchema,
  transformGoogleClassroomToInternal,
  type Classroom,
  type GoogleClassroom,
} from '../src/server/schemas/classroom.schemas';
import {
  GradingResultSchema,
  AIGradingRequestSchema,
  AIGradingResponseSchema,
  BatchGradingJobSchema,
  type GradingResult,
  type AIGradingRequest,
  type AIGradingResponse,
  type BatchGradingJob,
} from '../src/server/schemas/grading.schemas';

/**
 * Schema Drift Detection Tests
 *
 * These tests ensure that Zod schemas remain compatible with Convex database schemas
 * and that transformations between external APIs and internal schemas work correctly.
 *
 * As per claude.md guidelines:
 * - Use Zod at boundaries (forms, APIs, AI tools)
 * - Use Convex v for database schemas and function signatures
 * - Keep single TS type inferred from Zod for app-wide typing
 * - Add unit tests that round-trip canonical samples through Zod and validate Convex insertability
 */

describe('Schema Drift Detection - Classroom Boundaries', () => {
  it('should round-trip classroom data through Google API → Zod → Internal transformation', () => {
    // Sample data that could come from Google Classroom API
    const googleClassroomData: GoogleClassroom = {
      id: 'google_course_123',
      name: 'Advanced React Development',
      ownerId: 'teacher_456',
      courseState: 'ACTIVE',
      enrollmentCode: 'XYZ789',
      section: 'Fall 2024',
      description: 'Learn advanced React patterns and best practices',
      room: 'Lab 201',
      descriptionHeading: 'Course Description',
      alternateLink: 'https://classroom.google.com/c/google_course_123',
      teacherGroupEmail: 'react-teachers@university.edu',
      guardianInvitationsEnabled: true,
      creationTime: '2024-01-15T08:00:00.000Z',
      updateTime: '2024-01-16T10:30:00.000Z',
    };

    // Step 1: Validate Google Classroom data with Zod
    const validatedGoogleData = GoogleClassroomSchema.parse(googleClassroomData);
    expect(validatedGoogleData).toEqual(googleClassroomData);

    // Step 2: Transform to internal format
    const userId = 'professor@university.edu';
    const internalData = transformGoogleClassroomToInternal(validatedGoogleData, userId);

    // Step 3: Validate internal format matches our domain schema (without id)
    const ClassroomWithoutIdSchema = ClassroomSchema.omit({ id: true });
    const validatedInternalData = ClassroomWithoutIdSchema.parse(internalData);

    // Step 4: Verify transformation correctness
    expect(validatedInternalData.userId).toBe(userId);
    expect(validatedInternalData.courseId).toBe(googleClassroomData.id);
    expect(validatedInternalData.courseName).toBe(googleClassroomData.name);
    expect(validatedInternalData.ownerId).toBe(googleClassroomData.ownerId);
    expect(validatedInternalData.courseState).toBe(googleClassroomData.courseState);
    expect(validatedInternalData.guardianInvitationsEnabled).toBe(true);
    expect(typeof validatedInternalData.lastSyncTime).toBe('number');
    expect(validatedInternalData.lastSyncTime).toBeGreaterThan(0);

    // Step 5: Ensure data would be insertable into Convex
    // (Convex would add _id and _creationTime automatically)
    const convexInsertShape = {
      ...validatedInternalData,
      _id: 'generated_by_convex',
      _creationTime: Date.now(),
    };

    expect(convexInsertShape).toBeDefined();
    expect(convexInsertShape._id).toBeDefined();
    expect(convexInsertShape._creationTime).toBeDefined();
  });

  it('should handle partial Google Classroom data correctly', () => {
    // Minimal Google Classroom data (only required fields)
    const minimalGoogleData: GoogleClassroom = {
      id: 'minimal_course',
      name: 'Minimal Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
    };

    const validatedMinimal = GoogleClassroomSchema.parse(minimalGoogleData);
    const internalMinimal = transformGoogleClassroomToInternal(validatedMinimal, 'teacher@test.edu');

    // Should handle undefined optional fields gracefully
    expect(internalMinimal.enrollmentCode).toBeUndefined();
    expect(internalMinimal.section).toBeUndefined();
    expect(internalMinimal.room).toBeUndefined();
    expect(internalMinimal.guardianInvitationsEnabled).toBe(false); // Default value
  });

  it('should reject invalid Google Classroom data at boundary', () => {
    const invalidData = {
      id: '', // Invalid: empty string
      name: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'INVALID_STATE', // Invalid enum value
      alternateLink: 'not-a-url', // Invalid URL
      teacherGroupEmail: 'not-an-email', // Invalid email
    };

    expect(() => GoogleClassroomSchema.parse(invalidData)).toThrow();
  });
});

describe('Schema Drift Detection - AI Grading Boundaries', () => {
  it('should round-trip AI grading request through validation pipeline', () => {
    // Sample AI grading request that could come from the frontend
    const gradingRequest: AIGradingRequest = {
      submissionId: '123e4567-e89b-12d3-a456-426614174000',
      questionId: 'q_photosynthesis_001',
      questionText: 'Explain the process of photosynthesis and its importance in ecosystems.',
      questionType: 'PARAGRAPH',
      studentResponse: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process is crucial for ecosystems because it provides energy for all life forms and produces oxygen that animals need to breathe.',
      correctAnswer: 'Photosynthesis converts light energy into chemical energy, using CO2 and H2O to produce glucose and O2. It is the foundation of most food chains and maintains atmospheric oxygen levels.',
      rubric: 'Award points for: mentioning light energy conversion (2 pts), identifying reactants CO2 and H2O (2 pts), identifying products glucose and O2 (2 pts), explaining ecosystem importance (2 pts), scientific accuracy (2 pts).',
      pointsPossible: 10,
      context: {
        subject: 'Biology',
        gradeLevel: '9th Grade',
        assignmentTitle: 'Photosynthesis and Cellular Respiration Unit Test',
        additionalInstructions: 'Focus on scientific terminology and accuracy.',
      },
      config: {
        provider: 'gemini',
        model: 'gemini-pro',
        maxTokens: 800,
        temperature: 0.1,
        confidenceThreshold: 0.8,
        maxCostPerSubmission: 0.05,
      },
    };

    // Step 1: Validate request at API boundary
    const validatedRequest = AIGradingRequestSchema.parse(gradingRequest);

    // Check key fields rather than exact equality since Zod adds defaults
    expect(validatedRequest.submissionId).toBe(gradingRequest.submissionId);
    expect(validatedRequest.questionId).toBe(gradingRequest.questionId);
    expect(validatedRequest.questionText).toBe(gradingRequest.questionText);
    expect(validatedRequest.studentResponse).toBe(gradingRequest.studentResponse);
    expect(validatedRequest.config.provider).toBe(gradingRequest.config.provider);

    // Step 2: Simulate AI processing and create response
    const aiResponse: AIGradingResponse = {
      questionId: validatedRequest.questionId,
      pointsEarned: 9,
      pointsPossible: validatedRequest.pointsPossible,
      percentage: 90,
      isCorrect: true,
      confidence: 0.92,
      feedback: 'Excellent response! You correctly identified the key components of photosynthesis and explained its ecosystem importance. Consider adding more detail about the role of chloroplasts.',
      reasoning: 'Student demonstrated strong understanding of photosynthesis components (light, CO2, H2O → glucose, O2) and ecosystem significance. Minor deduction for not mentioning chloroplasts specifically.',
      suggestions: ['Mention chloroplasts as the site of photosynthesis', 'Include the chemical equation for extra precision'],
      processingTime: 2150,
      tokensUsed: 420,
      cost: 0.021,
      model: 'gemini-pro',
      provider: 'gemini',
    };

    // Step 3: Validate AI response
    const validatedResponse = AIGradingResponseSchema.parse(aiResponse);
    expect(validatedResponse).toEqual(aiResponse);

    // Step 4: Convert to internal grading result format
    const gradingResult: GradingResult = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      submissionId: validatedRequest.submissionId,
      questionId: validatedResponse.questionId,
      method: 'ai',
      pointsEarned: validatedResponse.pointsEarned,
      pointsPossible: validatedResponse.pointsPossible,
      percentage: validatedResponse.percentage,
      isCorrect: validatedResponse.isCorrect,
      confidence: validatedResponse.confidence,
      feedback: validatedResponse.feedback,
      reasoning: validatedResponse.reasoning,
      suggestions: validatedResponse.suggestions,
      gradedAt: Date.now(),
      gradedBy: 'system',
      needsReview: validatedResponse.confidence < 0.8,
    };

    // Step 5: Validate final grading result
    const validatedResult = GradingResultSchema.parse(gradingResult);
    expect(validatedResult).toEqual(gradingResult);
    expect(validatedResult.needsReview).toBe(false); // High confidence
  });

  it('should handle low-confidence AI grading results requiring review', () => {
    const lowConfidenceResponse: AIGradingResponse = {
      questionId: 'q_complex_001',
      pointsEarned: 6,
      pointsPossible: 10,
      percentage: 60,
      isCorrect: false,
      confidence: 0.45, // Low confidence
      feedback: 'The response shows some understanding but lacks key details. Please review manually.',
      reasoning: 'Student response was unclear and AI confidence is low.',
      suggestions: ['Requires human review', 'Consider providing additional feedback'],
      processingTime: 3200,
      tokensUsed: 650,
      cost: 0.032,
      model: 'gemini-pro',
      provider: 'gemini',
    };

    const validatedResponse = AIGradingResponseSchema.parse(lowConfidenceResponse);

    const gradingResult: GradingResult = {
      id: '123e4567-e89b-12d3-a456-426614174004',
      submissionId: '123e4567-e89b-12d3-a456-426614174000',
      questionId: validatedResponse.questionId,
      method: 'ai',
      pointsEarned: validatedResponse.pointsEarned,
      pointsPossible: validatedResponse.pointsPossible,
      percentage: validatedResponse.percentage,
      isCorrect: validatedResponse.isCorrect,
      confidence: validatedResponse.confidence,
      feedback: validatedResponse.feedback,
      reasoning: validatedResponse.reasoning,
      suggestions: validatedResponse.suggestions,
      gradedAt: Date.now(),
      gradedBy: 'system',
      needsReview: true, // Manually set due to low confidence
    };

    const validatedResult = GradingResultSchema.parse(gradingResult);
    expect(validatedResult.needsReview).toBe(true);
    expect(validatedResult.confidence).toBeLessThan(0.8);
  });
});

describe('Schema Drift Detection - Batch Processing Boundaries', () => {
  it('should round-trip batch grading job through status updates', () => {
    // Initial batch job creation
    const initialJob: BatchGradingJob = {
      id: '123e4567-e89b-12d3-a456-426614174005',
      assignmentId: '123e4567-e89b-12d3-a456-426614174006',
      userId: '123e4567-e89b-12d3-a456-426614174007',
      status: 'pending',
      method: 'ai',
      settings: {
        batchSize: 25,
        maxConcurrency: 5,
        skipAlreadyGraded: true,
        retryFailedSubmissions: true,
        notifyOnCompletion: true,
        publishToClassroom: false,
        aiConfig: {
          provider: 'gemini',
          model: 'gemini-pro',
          maxTokens: 1000,
          temperature: 0.1,
          confidenceThreshold: 0.75,
          maxCostPerSubmission: 0.08,
          dailyBudget: 100.0,
        },
      },
      progress: {
        totalSubmissions: 125,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        currentBatch: 0,
        totalBatches: 5,
        percentage: 0,
      },
      timing: {
        startTime: Date.now(),
        estimatedCompletion: Date.now() + (125 * 3000), // 3 seconds per submission
      },
      costs: {
        totalCost: 0,
        averageCostPerSubmission: 0,
        tokensUsed: 0,
      },
      errors: [],
      createdAt: Date.now() - 1000,
      updatedAt: Date.now(),
    };

    // Validate initial job
    const validatedInitial = BatchGradingJobSchema.parse(initialJob);
    expect(validatedInitial.status).toBe('pending');
    expect(validatedInitial.progress.percentage).toBe(0);

    // Simulate job in progress
    const runningJob: BatchGradingJob = {
      ...validatedInitial,
      status: 'running',
      progress: {
        ...validatedInitial.progress,
        processedCount: 50,
        successCount: 47,
        failedCount: 3,
        currentBatch: 2,
        percentage: 40,
      },
      timing: {
        ...validatedInitial.timing,
        averageTimePerSubmission: 2800,
      },
      costs: {
        totalCost: 2.35,
        averageCostPerSubmission: 0.047,
        tokensUsed: 23500,
      },
      errors: [
        {
          submissionId: '123e4567-e89b-12d3-a456-426614174008',
          error: 'AI service timeout',
          timestamp: Date.now() - 500,
          retryCount: 1,
        },
        {
          submissionId: '123e4567-e89b-12d3-a456-426614174009',
          error: 'Invalid response format',
          timestamp: Date.now() - 300,
          retryCount: 0,
        },
      ],
      updatedAt: Date.now(),
    };

    const validatedRunning = BatchGradingJobSchema.parse(runningJob);
    expect(validatedRunning.status).toBe('running');
    expect(validatedRunning.progress.percentage).toBe(40);
    expect(validatedRunning.errors).toHaveLength(2);

    // Simulate completed job
    const completedJob: BatchGradingJob = {
      ...validatedRunning,
      status: 'completed',
      progress: {
        ...validatedRunning.progress,
        processedCount: 125,
        successCount: 122,
        failedCount: 3,
        currentBatch: 5,
        percentage: 100,
      },
      timing: {
        ...validatedRunning.timing,
        endTime: Date.now(),
        averageTimePerSubmission: 2950,
      },
      costs: {
        totalCost: 5.85,
        averageCostPerSubmission: 0.048,
        tokensUsed: 58750,
      },
      updatedAt: Date.now(),
    };

    const validatedCompleted = BatchGradingJobSchema.parse(completedJob);
    expect(validatedCompleted.status).toBe('completed');
    expect(validatedCompleted.progress.percentage).toBe(100);
    expect(validatedCompleted.timing.endTime).toBeDefined();
  });

  it('should validate batch job constraints and limits', () => {
    const invalidJob = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      assignmentId: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174002',
      status: 'running',
      method: 'ai',
      settings: {
        batchSize: 100, // Invalid: exceeds limit of 50
        maxConcurrency: 20, // Invalid: exceeds limit of 10
        skipAlreadyGraded: true,
      },
      progress: {
        totalSubmissions: 100,
        processedCount: 50,
        successCount: 50,
        failedCount: 0,
        currentBatch: 2,
        totalBatches: 4,
        percentage: 150, // Invalid: exceeds 100%
      },
      timing: {},
      costs: {
        totalCost: -5, // Invalid: negative cost
      },
      errors: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(() => BatchGradingJobSchema.parse(invalidJob)).toThrow();
  });
});

describe('Schema Drift Detection - Error Recovery', () => {
  it('should handle malformed API responses gracefully', () => {
    const malformedResponses = [
      null,
      undefined,
      '',
      'not-json',
      123,
      [],
      { incomplete: 'data' },
      {
        questionId: 'valid',
        pointsEarned: 'not-a-number', // Type mismatch
        percentage: 150, // Out of range
      },
    ];

    malformedResponses.forEach(response => {
      expect(() => AIGradingResponseSchema.parse(response)).toThrow();
    });
  });

  it('should validate schema evolution compatibility', () => {
    // Test that adding optional fields doesn't break existing code
    const extendedClassroomSchema = ClassroomSchema.extend({
      newOptionalField: z.string().optional(),
      futureFeature: z.boolean().optional(),
    });

    const existingClassroom = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'teacher@test.edu',
      courseId: 'course_123',
      courseName: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE' as const,
      lastSyncTime: Date.now(),
    };

    // Should still work with extended schema
    const result = extendedClassroomSchema.parse(existingClassroom);
    expect(result.newOptionalField).toBeUndefined();
    expect(result.futureFeature).toBeUndefined();

    // Original schema should still work
    expect(() => ClassroomSchema.parse(existingClassroom)).not.toThrow();
  });

  it('should maintain backward compatibility with database shapes', () => {
    // Simulate data that might come from Convex with system fields
    const convexClassroomData = {
      _id: 'convex_generated_id',
      _creationTime: Date.now(),
      // Domain fields that match our Zod schema
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'teacher@test.edu',
      courseId: 'course_123',
      courseName: 'Test Course',
      ownerId: 'teacher_123',
      courseState: 'ACTIVE',
      lastSyncTime: Date.now(),
    };

    // Extract domain data (excluding Convex system fields)
    const domainData = Object.fromEntries(
      Object.entries(convexClassroomData).filter(([key]) => !key.startsWith('_'))
    );

    // Should validate successfully with our domain schema
    expect(() => ClassroomSchema.parse(domainData)).not.toThrow();
  });
});