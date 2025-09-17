// Mock Convex API for testing
// This file provides a mock implementation of the Convex API to avoid import resolution issues in tests

export const api = {
  autograding: {
    getClassrooms: 'autograding:getClassrooms',
    getClassroomStats: 'autograding:getClassroomStats',
    getGradingResults: 'autograding:getGradingResults',
    gradeWithAI: 'autograding:gradeWithAI',
    startBatchGrading: 'autograding:startBatchGrading',
    cancelBatchGrading: 'autograding:cancelBatchGrading',
    getBatchGradingJob: 'autograding:getBatchGradingJob',
    getGradingAnalytics: 'autograding:getGradingAnalytics',
    updateManualGrade: 'autograding:updateManualGrade',
    reviewGrade: 'autograding:reviewGrade',
    getGradingQueue: 'autograding:getGradingQueue',
  },
  classroomSync: {
    syncFromGoogleClassroom: 'classroomSync:syncFromGoogleClassroom',
  },
  assignments: {
    getAssignments: 'assignments:getAssignments',
    createAssignment: 'assignments:createAssignment',
    updateAssignment: 'assignments:updateAssignment',
    deleteAssignment: 'assignments:deleteAssignment',
  },
  submissions: {
    getSubmissions: 'submissions:getSubmissions',
    createSubmission: 'submissions:createSubmission',
    updateSubmission: 'submissions:updateSubmission',
  },
} as const;

// Type definitions for the API (in a real app, these would be auto-generated)
export type Api = typeof api;