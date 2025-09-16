import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// END-TO-END INTEGRATION TESTS
// ============================================

/**
 * Comprehensive test suite for the entire autograding system
 */
export const runIntegrationTests = action({
  args: {
    testMode: v.optional(v.boolean()),
    testCourseId: v.optional(v.string()),
    testAssignmentTitle: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const testResults = [];
    let overallSuccess = true;

    console.log("🧪 Starting End-to-End Integration Tests...");

    // Test 1: Assignment Creation and Configuration
    console.log("\n📝 Test 1: Assignment Creation and Configuration");
    try {
      const assignmentResult = await testAssignmentCreation(ctx, args);
      testResults.push({
        test: "Assignment Creation",
        success: assignmentResult.success,
        details: assignmentResult,
        duration: assignmentResult.duration
      });

      if (!assignmentResult.success) {
        overallSuccess = false;
      }

      // Use the created assignment for subsequent tests
      var testAssignmentId = assignmentResult.assignmentId;
      var testFormData = assignmentResult.formData;

    } catch (error) {
      testResults.push({
        test: "Assignment Creation",
        success: false,
        error: error.message,
        duration: 0
      });
      overallSuccess = false;
    }

    // Test 2: Form Response Processing
    if (testAssignmentId) {
      console.log("\n📊 Test 2: Form Response Processing");
      try {
        const responseResult = await testFormResponseProcessing(ctx, testAssignmentId, testFormData);
        testResults.push({
          test: "Form Response Processing",
          success: responseResult.success,
          details: responseResult,
          duration: responseResult.duration
        });

        if (!responseResult.success) {
          overallSuccess = false;
        }

        var testSubmissionIds = responseResult.submissionIds;

      } catch (error) {
        testResults.push({
          test: "Form Response Processing",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 3: Autograding Pipeline
    if (testAssignmentId && testSubmissionIds) {
      console.log("\n🎯 Test 3: Autograding Pipeline");
      try {
        const gradingResult = await testAutogradingPipeline(ctx, testAssignmentId, testSubmissionIds);
        testResults.push({
          test: "Autograding Pipeline",
          success: gradingResult.success,
          details: gradingResult,
          duration: gradingResult.duration
        });

        if (!gradingResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "Autograding Pipeline",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 4: Batch Processing
    if (testAssignmentId) {
      console.log("\n📦 Test 4: Batch Processing");
      try {
        const batchResult = await testBatchProcessing(ctx, testAssignmentId);
        testResults.push({
          test: "Batch Processing",
          success: batchResult.success,
          details: batchResult,
          duration: batchResult.duration
        });

        if (!batchResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "Batch Processing",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 5: AI Grading System
    if (testAssignmentId && testSubmissionIds) {
      console.log("\n🤖 Test 5: AI Grading System");
      try {
        const aiResult = await testAIGrading(ctx, testSubmissionIds[0]);
        testResults.push({
          test: "AI Grading System",
          success: aiResult.success,
          details: aiResult,
          duration: aiResult.duration
        });

        if (!aiResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "AI Grading System",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 6: Feedback Generation
    if (testAssignmentId && testSubmissionIds) {
      console.log("\n💬 Test 6: Feedback Generation");
      try {
        const feedbackResult = await testFeedbackGeneration(ctx, testSubmissionIds[0]);
        testResults.push({
          test: "Feedback Generation",
          success: feedbackResult.success,
          details: feedbackResult,
          duration: feedbackResult.duration
        });

        if (!feedbackResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "Feedback Generation",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 7: Grade Export
    if (testAssignmentId) {
      console.log("\n📤 Test 7: Grade Export");
      try {
        const exportResult = await testGradeExport(ctx, testAssignmentId);
        testResults.push({
          test: "Grade Export",
          success: exportResult.success,
          details: exportResult,
          duration: exportResult.duration
        });

        if (!exportResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "Grade Export",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 8: Classroom Sync Preparation
    if (testAssignmentId) {
      console.log("\n🔄 Test 8: Classroom Sync Preparation");
      try {
        const syncResult = await testClassroomSync(ctx, testAssignmentId);
        testResults.push({
          test: "Classroom Sync",
          success: syncResult.success,
          details: syncResult,
          duration: syncResult.duration
        });

        if (!syncResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "Classroom Sync",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 9: Result Publishing
    if (testAssignmentId) {
      console.log("\n📋 Test 9: Result Publishing");
      try {
        const publishResult = await testResultPublishing(ctx, testAssignmentId);
        testResults.push({
          test: "Result Publishing",
          success: publishResult.success,
          details: publishResult,
          duration: publishResult.duration
        });

        if (!publishResult.success) {
          overallSuccess = false;
        }

      } catch (error) {
        testResults.push({
          test: "Result Publishing",
          success: false,
          error: error.message,
          duration: 0
        });
        overallSuccess = false;
      }
    }

    // Test 10: Error Handling and Recovery
    console.log("\n⚠️ Test 10: Error Handling and Recovery");
    try {
      const errorResult = await testErrorHandling(ctx);
      testResults.push({
        test: "Error Handling",
        success: errorResult.success,
        details: errorResult,
        duration: errorResult.duration
      });

      if (!errorResult.success) {
        overallSuccess = false;
      }

    } catch (error) {
      testResults.push({
        test: "Error Handling",
        success: false,
        error: error.message,
        duration: 0
      });
      overallSuccess = false;
    }

    // Cleanup test data if in test mode
    if (args.testMode && testAssignmentId) {
      try {
        await cleanupTestData(ctx, testAssignmentId);
        console.log("🧹 Test data cleanup completed");
      } catch (error) {
        console.warn("⚠️ Failed to cleanup test data:", error.message);
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = testResults.filter(t => t.success).length;
    const totalTests = testResults.length;

    const summary = {
      overallSuccess,
      testsPassed: passedTests,
      totalTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      totalDuration,
      testResults,
      timestamp: new Date().toISOString()
    };

    console.log(`\n✅ Integration Tests Complete: ${passedTests}/${totalTests} passed (${summary.successRate}%)`);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);

    return summary;
  }
});

// ============================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================

async function testAssignmentCreation(ctx: any, args: any) {
  const startTime = Date.now();

  try {
    // Create a test assignment
    const assignmentData = {
      userId: "integration-test@example.com",
      title: args.testAssignmentTitle || "Integration Test Assignment",
      description: "Test assignment created for integration testing",
      courseId: args.testCourseId || "test-course-123",
      courseWorkId: "test-coursework-789",
      formId: "test-form-456",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      questions: [
        {
          questionId: "q1",
          questionText: "What is 2 + 2?",
          questionType: "multiple_choice",
          points: 10,
          required: true,
          choices: ["3", "4", "5", "6"],
          correctAnswer: "4"
        },
        {
          questionId: "q2",
          questionText: "Explain the water cycle in one paragraph.",
          questionType: "text",
          points: 20,
          required: true
        },
        {
          questionId: "q3",
          questionText: "Select all prime numbers:",
          questionType: "checkbox",
          points: 15,
          required: true,
          choices: ["2", "3", "4", "5", "6", "7"],
          correctAnswers: ["2", "3", "5", "7"]
        }
      ]
    };

    // Create the assignment
    const assignment = await ctx.runMutation(api.assignments.createAssignment, {
      userId: assignmentData.userId,
      title: assignmentData.title,
      description: assignmentData.description,
      courseId: assignmentData.courseId,
      courseWorkId: assignmentData.courseWorkId,
      formId: assignmentData.formId,
      dueDate: assignmentData.dueDate
    });

    // Configure grading rules
    await ctx.runMutation(api.autograding.saveGradingConfig, {
      assignmentId: assignment._id,
      totalPoints: 45,
      gradingRules: assignmentData.questions.map(q => ({
        questionId: q.questionId,
        algorithm: q.questionType === "multiple_choice" ? "exact_match" :
                   q.questionType === "checkbox" ? "partial_credit" : "similarity",
        parameters: {
          caseSensitive: false,
          partialCredit: true,
          similarityThreshold: 0.8
        }
      }))
    });

    return {
      success: true,
      assignmentId: assignment._id,
      formData: assignmentData,
      message: "Assignment created and configured successfully",
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testFormResponseProcessing(ctx: any, assignmentId: string, formData: any) {
  const startTime = Date.now();

  try {
    // Create test form responses
    const testResponses = [
      {
        studentId: "student1@test.com",
        studentName: "Test Student 1",
        responses: [
          { questionId: "q1", response: "4" },
          { questionId: "q2", response: "The water cycle involves evaporation, condensation, and precipitation." },
          { questionId: "q3", response: ["2", "3", "5", "7"] }
        ]
      },
      {
        studentId: "student2@test.com",
        studentName: "Test Student 2",
        responses: [
          { questionId: "q1", response: "5" }, // Incorrect
          { questionId: "q2", response: "Water goes up and down." }, // Basic answer
          { questionId: "q3", response: ["2", "3", "4"] } // Partially correct
        ]
      },
      {
        studentId: "student3@test.com",
        studentName: "Test Student 3",
        responses: [
          { questionId: "q1", response: "4" },
          { questionId: "q2", response: "The water cycle is a continuous process where water evaporates from bodies of water, forms clouds through condensation, and returns to earth as precipitation." },
          { questionId: "q3", response: ["2", "3", "5", "7"] }
        ]
      }
    ];

    const submissionIds = [];

    // Process each response
    for (const responseData of testResponses) {
      const submission = await ctx.runMutation(api.submissions.createSubmission, {
        assignmentId: assignmentId,
        studentId: responseData.studentId,
        studentName: responseData.studentName,
        responses: responseData.responses,
        submissionTime: Date.now()
      });

      submissionIds.push(submission._id);
    }

    return {
      success: true,
      submissionIds,
      submissionsProcessed: testResponses.length,
      message: `${testResponses.length} form responses processed successfully`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testAutogradingPipeline(ctx: any, assignmentId: string, submissionIds: string[]) {
  const startTime = Date.now();

  try {
    let gradedCount = 0;
    const gradingResults = [];

    // Test autograding for each submission
    for (const submissionId of submissionIds) {
      const result = await ctx.runMutation(api.submissionPipeline.processSubmissionPipeline, {
        submissionId: submissionId,
        options: {
          skipValidation: false,
          autoPublish: false
        }
      });

      if (result.success) {
        gradedCount++;
      }

      gradingResults.push({
        submissionId,
        success: result.success,
        stage: result.stage,
        totalScore: result.gradingResult?.totalScore,
        percentage: result.gradingResult?.percentage
      });
    }

    return {
      success: gradedCount === submissionIds.length,
      gradedCount,
      totalSubmissions: submissionIds.length,
      gradingResults,
      message: `${gradedCount}/${submissionIds.length} submissions graded successfully`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testBatchProcessing(ctx: any, assignmentId: string) {
  const startTime = Date.now();

  try {
    // Create a batch grading job
    const batchJob = await ctx.runMutation(api.batchGrading.createBatchGradingJob, {
      assignmentId: assignmentId,
      userId: "test-teacher@test.com",
      settings: {
        batchSize: 5,
        maxConcurrency: 2,
        skipAlreadyGraded: false
      }
    });

    // Start the batch job
    const startResult = await ctx.runAction(api.batchGrading.startBatchGrading, {
      jobId: batchJob._id
    });

    // Monitor batch progress (simplified for test)
    let attempts = 0;
    let status;
    while (attempts < 10) {
      status = await ctx.runQuery(api.batchGrading.getBatchJobStatus, {
        jobId: batchJob._id
      });

      if (status.status === "completed" || status.status === "failed") {
        break;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: status?.status === "completed",
      jobStatus: status?.status,
      processedCount: status?.processedCount || 0,
      totalCount: status?.totalCount || 0,
      message: `Batch processing ${status?.status}: ${status?.processedCount || 0}/${status?.totalCount || 0} submissions`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testAIGrading(ctx: any, submissionId: string) {
  const startTime = Date.now();

  try {
    // Test AI grading for an open-ended question
    const aiResult = await ctx.runAction(api.aiGrading.gradeWithAI, {
      submissionId: submissionId,
      questionId: "q2" // The text question
    });

    return {
      success: aiResult.success,
      confidence: aiResult.confidence,
      score: aiResult.score,
      feedback: aiResult.feedback?.substring(0, 100) + "...",
      requiresReview: aiResult.requiresHumanReview,
      message: `AI grading completed with ${Math.round((aiResult.confidence || 0) * 100)}% confidence`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testFeedbackGeneration(ctx: any, submissionId: string) {
  const startTime = Date.now();

  try {
    // Generate comprehensive feedback
    const feedbackResult = await ctx.runAction(api.feedbackSystem.generateSubmissionFeedback, {
      submissionId: submissionId,
      options: {
        includeStudentProfile: false,
        customFeedbackConfig: {
          style: "constructive",
          includeImprovementSuggestions: true,
          includeResourceRecommendations: true
        }
      }
    });

    return {
      success: feedbackResult.success,
      feedbackLength: feedbackResult.feedback?.length || 0,
      improvementSuggestions: feedbackResult.improvementSuggestions?.length || 0,
      resources: feedbackResult.resourceRecommendations?.length || 0,
      message: `Feedback generated: ${feedbackResult.feedback?.length || 0} characters`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testGradeExport(ctx: any, assignmentId: string) {
  const startTime = Date.now();

  try {
    // Test CSV export
    const csvExport = await ctx.runQuery(api.gradeExport.exportToCSV, {
      assignmentId: assignmentId,
      format: {
        includeHeaders: true,
        includeMetadata: true,
        includeDetailedFeedback: true,
        includeQuestionBreakdown: true,
        dateFormat: "iso",
        numberPrecision: 2
      }
    });

    // Test JSON export
    const jsonExport = await ctx.runQuery(api.gradeExport.exportToJSON, {
      assignmentId: assignmentId,
      format: {
        includeMetadata: true,
        includeDetailedFeedback: true,
        includeQuestionBreakdown: true,
        numberPrecision: 2
      }
    });

    return {
      success: csvExport.content && jsonExport.content,
      csvSize: csvExport.size,
      jsonSize: jsonExport.size,
      csvFilename: csvExport.filename,
      jsonFilename: jsonExport.filename,
      message: `Export generated: CSV (${csvExport.size} bytes), JSON (${jsonExport.size} bytes)`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testClassroomSync(ctx: any, assignmentId: string) {
  const startTime = Date.now();

  try {
    // Configure sync settings
    await ctx.runMutation(api.classroomSync.configureGradeSync, {
      assignmentId: assignmentId,
      classroomConfig: {
        classroomId: "test-classroom-123",
        courseWorkId: "test-coursework-456",
        maxPoints: 100,
        syncMode: "manual",
        notifyStudents: false,
        includeComments: true
      }
    });

    // Prepare grades for sync
    const syncData = await ctx.runQuery(api.classroomSync.prepareGradesForSync, {
      assignmentId: assignmentId,
      includeUngraded: false
    });

    // Test sync in test mode
    const syncResult = await ctx.runAction(api.classroomSync.syncGradesToClassroom, {
      assignmentId: assignmentId,
      testMode: true
    });

    return {
      success: syncResult.success,
      gradesReady: syncData.syncStats.readyForSync,
      syncedCount: syncResult.stats?.successful || 0,
      failedCount: syncResult.stats?.failed || 0,
      message: `Sync test completed: ${syncResult.stats?.successful || 0} successful, ${syncResult.stats?.failed || 0} failed`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testResultPublishing(ctx: any, assignmentId: string) {
  const startTime = Date.now();

  try {
    // Configure publication settings
    await ctx.runMutation(api.resultPublishing.configureResultPublication, {
      assignmentId: assignmentId,
      config: {
        publishMode: "manual",
        includeDetailedFeedback: true,
        includeGradingRubric: false,
        notificationSettings: {
          emailStudents: false,
          emailInstructors: false,
          classroomNotification: false
        },
        privacySettings: {
          showIndividualScores: true,
          showClassStatistics: true,
          showPeerComparisons: false,
          anonymizeResults: false
        }
      }
    });

    // Prepare results for publication
    const resultsData = await ctx.runQuery(api.resultPublishing.prepareResultsForPublication, {
      assignmentId: assignmentId
    });

    // Test publish in test mode
    const publishResult = await ctx.runAction(api.resultPublishing.publishResults, {
      assignmentId: assignmentId,
      testMode: true
    });

    return {
      success: publishResult.success,
      studentsNotified: publishResult.studentsNotified || 0,
      totalStudents: resultsData.summary.gradedStudents,
      publicationUrl: publishResult.publicationUrl,
      message: `Publication test completed: ${publishResult.studentsNotified || 0} students notified`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testErrorHandling(ctx: any) {
  const startTime = Date.now();

  try {
    // Test API error handling
    const errorResult = await ctx.runAction(api.apiErrorHandling.executeWithRetry, {
      operationName: "test_operation",
      operationParams: { shouldFail: true },
      apiService: "general",
      retryConfigOverride: {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000
      },
      operationId: "integration-test-error-handling"
    });

    // This should fail after retries
    return {
      success: !errorResult.success, // We expect this to fail
      attemptsUsed: errorResult.attempts || 0,
      message: `Error handling test completed: operation failed after ${errorResult.attempts || 0} attempts as expected`,
      duration: Date.now() - startTime
    };

  } catch (error) {
    // Expected behavior - the operation should fail
    return {
      success: true,
      message: "Error handling working correctly - operation failed as expected",
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function cleanupTestData(ctx: any, assignmentId: string) {
  // Get all submissions for this assignment
  const submissions = await ctx.db
    .query("submissions")
    .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
    .collect();

  // Delete submissions
  for (const submission of submissions) {
    await ctx.db.delete(submission._id);
  }

  // Delete grading configs
  const gradingConfigs = await ctx.db
    .query("gradingConfigs")
    .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
    .collect();

  for (const config of gradingConfigs) {
    await ctx.db.delete(config._id);
  }

  // Delete the assignment
  await ctx.db.delete(assignmentId);

  console.log(`Cleaned up test data for assignment ${assignmentId}`);
}