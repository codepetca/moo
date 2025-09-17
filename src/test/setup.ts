import '@testing-library/jest-dom'
import { beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global test setup
beforeAll(() => {
  // Mock environment variables
  vi.stubEnv('VITE_CONVEX_URL', 'https://test-convex-url.convex.cloud');

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Convex environment
global.process = global.process || {}
global.process.env = global.process.env || {}

// Mock Convex hooks
export const mockConvexQuery = vi.fn();
export const mockConvexMutation = vi.fn();
export const mockConvexAction = vi.fn();

// Mock Convex client for testing
export const mockConvexClient = {
  query: mockConvexQuery,
  mutation: mockConvexMutation,
  action: mockConvexAction,
}

// Mock environment variables
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Mock IntersectionObserver for any components that might use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock fetch globally for tests
global.fetch = vi.fn();

// Test data factories
export const createMockClassroom = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'teacher@test.edu',
  courseId: 'course_123',
  courseName: 'Test Course',
  ownerId: 'teacher_123',
  courseState: 'ACTIVE' as const,
  lastSyncTime: Date.now(),
  ...overrides,
});

export const createMockGradingResult = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  submissionId: '123e4567-e89b-12d3-a456-426614174001',
  questionId: 'question_123',
  method: 'ai' as const,
  pointsEarned: 8,
  pointsPossible: 10,
  percentage: 80,
  isCorrect: true,
  confidence: 0.85,
  gradedAt: Date.now(),
  needsReview: false,
  ...overrides,
});

export const createMockSubmission = (overrides = {}) => ({
  _id: '123e4567-e89b-12d3-a456-426614174000',
  assignmentId: '123e4567-e89b-12d3-a456-426614174001',
  courseId: 'course_123',
  courseWorkId: 'coursework_123',
  formId: 'form_123',
  studentId: 'student_123',
  studentEmail: 'student@test.edu',
  studentName: 'Test Student',
  submissionId: 'submission_123',
  state: 'TURNED_IN' as const,
  submissionTime: Date.now(),
  responses: [],
  lastSyncTime: Date.now(),
  ...overrides,
});

// Mock Convex API
const mockAPI = {
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
};

vi.mock('@/convex/_generated/api', () => ({
  api: mockAPI,
}));

// Setup default mocks for Convex
vi.mock('convex/react', () => ({
  useQuery: mockConvexQuery,
  useMutation: mockConvexMutation,
  useAction: mockConvexAction,
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  ConvexReactClient: vi.fn().mockImplementation(() => ({})),
}));

// Reset mocks before each test
beforeEach(() => {
  mockConvexQuery.mockReturnValue(undefined);
  mockConvexMutation.mockReturnValue(vi.fn());
  mockConvexAction.mockReturnValue(vi.fn());
});