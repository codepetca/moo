import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// GRADE EXPORT UTILITIES & FORMATTING
// ============================================

/**
 * Export format configurations
 */
interface ExportFormat {
  type: "csv" | "excel" | "json" | "pdf" | "google_sheets" | "classroom_grades";
  includeHeaders: boolean;
  includeMetadata: boolean;
  includeDetailedFeedback: boolean;
  includeQuestionBreakdown: boolean;
  includeStatistics: boolean;
  dateFormat: "iso" | "us" | "eu" | "timestamp";
  numberPrecision: number;
  customFields?: string[];
}

/**
 * Export data structure for different formats
 */
interface ExportData {
  metadata: {
    assignmentTitle: string;
    assignmentId: string;
    exportDate: string;
    exportedBy: string;
    totalSubmissions: number;
    gradedSubmissions: number;
    classStatistics: {
      averageScore: number;
      medianScore: number;
      standardDeviation: number;
      highestScore: number;
      lowestScore: number;
    };
  };
  submissions: ExportSubmissionData[];
}

/**
 * Individual submission data for export
 */
interface ExportSubmissionData {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  submissionDate: string;
  gradeDetails: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    letterGrade: string;
    classRank?: number;
  };
  questionResults?: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    studentResponse: any;
    correctAnswer?: any;
    pointsEarned: number;
    pointsPossible: number;
    feedback?: string;
    gradingAlgorithm?: string;
  }>;
  overallFeedback?: string;
  submissionMetadata?: {
    submissionTime: number;
    gradingTime?: number;
    lastModified?: number;
    pipelineStage?: string;
  };
}

/**
 * Generate export data for an assignment
 */
export const generateExportData = query({
  args: {
    assignmentId: v.id("assignments"),
    includeUngraded: v.optional(v.boolean()),
    anonymizeData: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Get all submissions
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    // Filter based on grading status
    const exportSubmissions = args.includeUngraded
      ? submissions
      : submissions.filter(sub => sub.score !== undefined);

    // Calculate class statistics
    const gradedScores = submissions
      .filter(sub => sub.score !== undefined)
      .map(sub => sub.score || 0);

    const classStatistics = {
      averageScore: gradedScores.length > 0 ? gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length : 0,
      medianScore: gradedScores.length > 0 ? gradedScores.sort((a, b) => a - b)[Math.floor(gradedScores.length / 2)] : 0,
      standardDeviation: 0,
      highestScore: gradedScores.length > 0 ? Math.max(...gradedScores) : 0,
      lowestScore: gradedScores.length > 0 ? Math.min(...gradedScores) : 0
    };

    // Calculate standard deviation
    if (gradedScores.length > 0) {
      const variance = gradedScores.reduce((acc, score) => acc + Math.pow(score - classStatistics.averageScore, 2), 0) / gradedScores.length;
      classStatistics.standardDeviation = Math.sqrt(variance);
    }

    // Prepare export submission data
    const exportSubmissionData: ExportSubmissionData[] = exportSubmissions.map((sub, index) => {
      const gradingResults = sub.gradingResults as any || {};
      const questionResults = Array.isArray(gradingResults.questionResults) ? gradingResults.questionResults : [];

      // Calculate class rank
      const betterScores = gradedScores.filter(score => score > (sub.score || 0)).length;
      const classRank = gradedScores.length > 0 ? betterScores + 1 : undefined;

      const baseData: ExportSubmissionData = {
        studentId: args.anonymizeData ? `Student_${index + 1}` : sub.studentId,
        studentName: args.anonymizeData ? `Student ${index + 1}` : sub.studentName,
        studentEmail: args.anonymizeData ? undefined : sub.studentEmail,
        submissionDate: new Date(sub.submissionTime).toISOString(),
        gradeDetails: {
          totalScore: sub.score || 0,
          maxScore: sub.totalPossibleScore || 0,
          percentage: sub.percentage || 0,
          letterGrade: calculateLetterGrade(sub.percentage || 0),
          classRank
        },
        questionResults: questionResults.map((qr: any) => ({
          questionId: qr.questionId,
          questionText: qr.questionText || `Question ${qr.questionId}`,
          questionType: qr.questionType || "unknown",
          studentResponse: qr.studentAnswer,
          correctAnswer: qr.correctAnswer,
          pointsEarned: qr.score || 0,
          pointsPossible: qr.maxScore || 0,
          feedback: qr.feedback,
          gradingAlgorithm: qr.algorithm
        })),
        overallFeedback: Array.isArray(sub.feedback) ? sub.feedback.join("\n\n") : sub.feedback,
        submissionMetadata: {
          submissionTime: sub.submissionTime,
          gradingTime: sub.gradingTimestamp,
          lastModified: sub._creationTime,
          pipelineStage: (sub.pipelineStatus as any)?.currentStage
        }
      };

      return baseData;
    });

    const exportData: ExportData = {
      metadata: {
        assignmentTitle: assignment.title,
        assignmentId: args.assignmentId,
        exportDate: new Date().toISOString(),
        exportedBy: "System", // Could be passed as parameter
        totalSubmissions: submissions.length,
        gradedSubmissions: gradedScores.length,
        classStatistics
      },
      submissions: exportSubmissionData
    };

    return exportData;
  }
});

/**
 * Export grades in CSV format
 */
export const exportToCSV = query({
  args: {
    assignmentId: v.id("assignments"),
    format: v.object({
      includeHeaders: v.boolean(),
      includeMetadata: v.boolean(),
      includeDetailedFeedback: v.boolean(),
      includeQuestionBreakdown: v.boolean(),
      dateFormat: v.union(v.literal("iso"), v.literal("us"), v.literal("eu")),
      numberPrecision: v.number()
    }),
    anonymizeData: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const exportData = await ctx.runQuery(api.gradeExport.generateExportData, {
      assignmentId: args.assignmentId,
      anonymizeData: args.anonymizeData
    });

    let csvContent = "";

    // Add metadata header if requested
    if (args.format.includeMetadata) {
      csvContent += `# Assignment: ${exportData.metadata.assignmentTitle}\n`;
      csvContent += `# Export Date: ${formatDate(exportData.metadata.exportDate, args.format.dateFormat)}\n`;
      csvContent += `# Total Submissions: ${exportData.metadata.totalSubmissions}\n`;
      csvContent += `# Graded Submissions: ${exportData.metadata.gradedSubmissions}\n`;
      csvContent += `# Class Average: ${exportData.metadata.classStatistics.averageScore.toFixed(args.format.numberPrecision)}\n`;
      csvContent += `# Class Median: ${exportData.metadata.classStatistics.medianScore.toFixed(args.format.numberPrecision)}\n`;
      csvContent += "\n";
    }

    // Build header row
    const headers = [
      "Student ID",
      "Student Name",
      "Student Email",
      "Submission Date",
      "Total Score",
      "Max Score",
      "Percentage",
      "Letter Grade",
      "Class Rank"
    ];

    if (args.format.includeQuestionBreakdown) {
      // Add question headers based on first submission with questions
      const firstSubmissionWithQuestions = exportData.submissions.find(sub => sub.questionResults && sub.questionResults.length > 0);
      if (firstSubmissionWithQuestions) {
        firstSubmissionWithQuestions.questionResults?.forEach((qr, index) => {
          headers.push(`Q${index + 1} Score`);
          headers.push(`Q${index + 1} Max`);
          if (args.format.includeDetailedFeedback) {
            headers.push(`Q${index + 1} Feedback`);
          }
        });
      }
    }

    if (args.format.includeDetailedFeedback) {
      headers.push("Overall Feedback");
    }

    // Add headers to CSV
    if (args.format.includeHeaders) {
      csvContent += headers.map(header => escapeCSVField(header)).join(",") + "\n";
    }

    // Add data rows
    exportData.submissions.forEach(submission => {
      const row = [
        submission.studentId,
        submission.studentName || "",
        submission.studentEmail || "",
        formatDate(submission.submissionDate, args.format.dateFormat),
        submission.gradeDetails.totalScore.toFixed(args.format.numberPrecision),
        submission.gradeDetails.maxScore.toFixed(args.format.numberPrecision),
        submission.gradeDetails.percentage.toFixed(args.format.numberPrecision),
        submission.gradeDetails.letterGrade,
        submission.gradeDetails.classRank?.toString() || ""
      ];

      if (args.format.includeQuestionBreakdown) {
        submission.questionResults?.forEach(qr => {
          row.push(qr.pointsEarned.toFixed(args.format.numberPrecision));
          row.push(qr.pointsPossible.toFixed(args.format.numberPrecision));
          if (args.format.includeDetailedFeedback) {
            row.push(qr.feedback || "");
          }
        });
      }

      if (args.format.includeDetailedFeedback) {
        row.push(submission.overallFeedback || "");
      }

      csvContent += row.map(field => escapeCSVField(field.toString())).join(",") + "\n";
    });

    return {
      content: csvContent,
      filename: `${exportData.metadata.assignmentTitle.replace(/[^a-zA-Z0-9]/g, "_")}_grades_${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: "text/csv",
      size: csvContent.length
    };
  }
});

/**
 * Export grades in JSON format
 */
export const exportToJSON = query({
  args: {
    assignmentId: v.id("assignments"),
    format: v.object({
      includeMetadata: v.boolean(),
      includeDetailedFeedback: v.boolean(),
      includeQuestionBreakdown: v.boolean(),
      numberPrecision: v.number()
    }),
    anonymizeData: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const exportData = await ctx.runQuery(api.gradeExport.generateExportData, {
      assignmentId: args.assignmentId,
      anonymizeData: args.anonymizeData
    });

    // Clean up data based on format options
    const cleanedData = {
      ...(args.format.includeMetadata && { metadata: exportData.metadata }),
      submissions: exportData.submissions.map(submission => ({
        studentId: submission.studentId,
        studentName: submission.studentName,
        studentEmail: submission.studentEmail,
        submissionDate: submission.submissionDate,
        gradeDetails: {
          totalScore: Math.round(submission.gradeDetails.totalScore * Math.pow(10, args.format.numberPrecision)) / Math.pow(10, args.format.numberPrecision),
          maxScore: submission.gradeDetails.maxScore,
          percentage: Math.round(submission.gradeDetails.percentage * Math.pow(10, args.format.numberPrecision)) / Math.pow(10, args.format.numberPrecision),
          letterGrade: submission.gradeDetails.letterGrade,
          classRank: submission.gradeDetails.classRank
        },
        ...(args.format.includeQuestionBreakdown && { questionResults: submission.questionResults }),
        ...(args.format.includeDetailedFeedback && { overallFeedback: submission.overallFeedback })
      }))
    };

    const jsonContent = JSON.stringify(cleanedData, null, 2);

    return {
      content: jsonContent,
      filename: `${exportData.metadata.assignmentTitle.replace(/[^a-zA-Z0-9]/g, "_")}_grades_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: "application/json",
      size: jsonContent.length
    };
  }
});

/**
 * Export grades in Google Classroom compatible format
 */
export const exportForClassroom = query({
  args: {
    assignmentId: v.id("assignments"),
    maxPoints: v.number()
  },
  handler: async (ctx, args) => {
    const exportData = await ctx.runQuery(api.gradeExport.generateExportData, {
      assignmentId: args.assignmentId,
      includeUngraded: false
    });

    // Format for Google Classroom CSV import
    const classroomData = exportData.submissions.map(submission => {
      const classroomGrade = Math.round((submission.gradeDetails.percentage / 100) * args.maxPoints);

      return {
        "Student Email": submission.studentEmail || "",
        "Student ID": submission.studentId,
        "Student Name": submission.studentName || "",
        "Assignment Grade": classroomGrade,
        "Max Points": args.maxPoints,
        "Comments": submission.overallFeedback || ""
      };
    });

    // Convert to CSV format
    const headers = Object.keys(classroomData[0] || {});
    let csvContent = headers.join(",") + "\n";

    classroomData.forEach(row => {
      const values = headers.map(header => escapeCSVField(row[header as keyof typeof row]?.toString() || ""));
      csvContent += values.join(",") + "\n";
    });

    return {
      content: csvContent,
      filename: `classroom_grades_${exportData.metadata.assignmentTitle.replace(/[^a-zA-Z0-9]/g, "_")}.csv`,
      mimeType: "text/csv",
      format: "google_classroom",
      totalRecords: classroomData.length
    };
  }
});

/**
 * Create grade report summary
 */
export const generateGradeReport = query({
  args: {
    assignmentId: v.id("assignments"),
    includeCharts: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const exportData = await ctx.runQuery(api.gradeExport.generateExportData, {
      assignmentId: args.assignmentId,
      includeUngraded: false
    });

    // Grade distribution analysis
    const gradeDistribution = calculateGradeDistribution(exportData.submissions);

    // Performance insights
    const performanceInsights = generatePerformanceInsights(exportData);

    // Question-level analysis
    const questionAnalysis = generateQuestionAnalysis(exportData.submissions);

    const report = {
      assignment: {
        title: exportData.metadata.assignmentTitle,
        totalSubmissions: exportData.metadata.totalSubmissions,
        gradedSubmissions: exportData.metadata.gradedSubmissions,
        completionRate: Math.round((exportData.metadata.gradedSubmissions / exportData.metadata.totalSubmissions) * 100)
      },
      statistics: exportData.metadata.classStatistics,
      gradeDistribution,
      performanceInsights,
      questionAnalysis,
      generatedAt: new Date().toISOString()
    };

    return report;
  }
});

/**
 * Bulk export multiple assignments
 */
export const bulkExportAssignments = action({
  args: {
    assignmentIds: v.array(v.id("assignments")),
    format: v.union(v.literal("csv"), v.literal("json")),
    consolidate: v.boolean()
  },
  handler: async (ctx, args) => {
    const exports = [];

    for (const assignmentId of args.assignmentIds) {
      try {
        let exportResult;

        if (args.format === "csv") {
          exportResult = await ctx.runQuery(api.gradeExport.exportToCSV, {
            assignmentId,
            format: {
              includeHeaders: true,
              includeMetadata: true,
              includeDetailedFeedback: true,
              includeQuestionBreakdown: true,
              dateFormat: "iso" as const,
              numberPrecision: 2
            }
          });
        } else {
          exportResult = await ctx.runQuery(api.gradeExport.exportToJSON, {
            assignmentId,
            format: {
              includeMetadata: true,
              includeDetailedFeedback: true,
              includeQuestionBreakdown: true,
              numberPrecision: 2
            }
          });
        }

        exports.push({
          assignmentId,
          success: true,
          export: exportResult
        });

      } catch (error) {
        exports.push({
          assignmentId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (args.consolidate && args.format === "json") {
      // Consolidate all exports into a single JSON file
      const consolidatedData = {
        exportDate: new Date().toISOString(),
        assignments: exports.filter(e => e.success).map(e => JSON.parse(e.export.content))
      };

      return {
        consolidated: true,
        content: JSON.stringify(consolidatedData, null, 2),
        filename: `consolidated_grades_${new Date().toISOString().split('T')[0]}.json`,
        successCount: exports.filter(e => e.success).length,
        failureCount: exports.filter(e => !e.success).length,
        errors: exports.filter(e => !e.success).map(e => ({ assignmentId: e.assignmentId, error: e.error }))
      };
    }

    return {
      consolidated: false,
      exports,
      successCount: exports.filter(e => e.success).length,
      failureCount: exports.filter(e => !e.success).length
    };
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function formatDate(dateString: string, format: "iso" | "us" | "eu"): string {
  const date = new Date(dateString);

  switch (format) {
    case "us":
      return date.toLocaleDateString("en-US");
    case "eu":
      return date.toLocaleDateString("en-GB");
    case "iso":
    default:
      return date.toISOString().split('T')[0];
  }
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function calculateGradeDistribution(submissions: ExportSubmissionData[]) {
  const letterGradeCounts: Record<string, number> = {};
  const scoreRanges = {
    "90-100": 0,
    "80-89": 0,
    "70-79": 0,
    "60-69": 0,
    "Below 60": 0
  };

  submissions.forEach(submission => {
    // Letter grade distribution
    const letterGrade = submission.gradeDetails.letterGrade;
    letterGradeCounts[letterGrade] = (letterGradeCounts[letterGrade] || 0) + 1;

    // Score range distribution
    const percentage = submission.gradeDetails.percentage;
    if (percentage >= 90) scoreRanges["90-100"]++;
    else if (percentage >= 80) scoreRanges["80-89"]++;
    else if (percentage >= 70) scoreRanges["70-79"]++;
    else if (percentage >= 60) scoreRanges["60-69"]++;
    else scoreRanges["Below 60"]++;
  });

  return {
    letterGrades: letterGradeCounts,
    scoreRanges
  };
}

function generatePerformanceInsights(exportData: ExportData) {
  const submissions = exportData.submissions;
  const stats = exportData.metadata.classStatistics;

  const insights = [];

  // Performance distribution insights
  const highPerformers = submissions.filter(s => s.gradeDetails.percentage >= 90).length;
  const lowPerformers = submissions.filter(s => s.gradeDetails.percentage < 60).length;
  const percentHigh = Math.round((highPerformers / submissions.length) * 100);
  const percentLow = Math.round((lowPerformers / submissions.length) * 100);

  insights.push(`${percentHigh}% of students scored 90% or above (${highPerformers} students)`);
  insights.push(`${percentLow}% of students scored below 60% (${lowPerformers} students)`);

  // Standard deviation insights
  if (stats.standardDeviation < 10) {
    insights.push("Low score variation - students performed consistently");
  } else if (stats.standardDeviation > 20) {
    insights.push("High score variation - wide range of student performance");
  }

  return insights;
}

function generateQuestionAnalysis(submissions: ExportSubmissionData[]) {
  const questionStats: Record<string, { totalPoints: number; earnedPoints: number; attempts: number }> = {};

  submissions.forEach(submission => {
    submission.questionResults?.forEach(qr => {
      if (!questionStats[qr.questionId]) {
        questionStats[qr.questionId] = { totalPoints: 0, earnedPoints: 0, attempts: 0 };
      }

      questionStats[qr.questionId].totalPoints += qr.pointsPossible;
      questionStats[qr.questionId].earnedPoints += qr.pointsEarned;
      questionStats[qr.questionId].attempts++;
    });
  });

  const analysis = Object.entries(questionStats).map(([questionId, stats]) => {
    const averageScore = stats.attempts > 0 ? (stats.earnedPoints / stats.totalPoints) * 100 : 0;
    const difficulty = averageScore >= 80 ? "Easy" : averageScore >= 60 ? "Medium" : "Hard";

    return {
      questionId,
      averageScore: Math.round(averageScore * 100) / 100,
      difficulty,
      attempts: stats.attempts,
      needsReview: averageScore < 60
    };
  });

  return analysis.sort((a, b) => a.averageScore - b.averageScore);
}