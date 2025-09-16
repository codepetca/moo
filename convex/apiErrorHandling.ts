import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ============================================
// API ERROR HANDLING & RETRY LOGIC
// ============================================

/**
 * Error classification and retry configuration
 */
interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  category: "network" | "authentication" | "rate_limit" | "server" | "client" | "unknown";
  httpStatus?: number;
  apiService: "google_classroom" | "google_forms" | "email" | "ai_service" | "general";
}

/**
 * Retry configuration for different error types
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBackoff: boolean;
  jitterPercent: number; // 0-100
}

/**
 * Operation tracking for retries
 */
interface OperationAttempt {
  attemptNumber: number;
  timestamp: number;
  error?: ApiError;
  success: boolean;
  responseTime: number;
  retryDelay?: number;
}

/**
 * Predefined retry configurations for different scenarios
 */
const RETRY_CONFIGS: Record<string, RetryConfig> = {
  // Network errors - aggressive retry
  network_error: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBackoff: true,
    jitterPercent: 25
  },
  // Rate limiting - respectful retry with longer delays
  rate_limit: {
    maxAttempts: 8,
    baseDelay: 5000,
    maxDelay: 300000, // 5 minutes
    exponentialBackoff: true,
    jitterPercent: 10
  },
  // Server errors - moderate retry
  server_error: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 60000,
    exponentialBackoff: true,
    jitterPercent: 20
  },
  // Authentication errors - minimal retry (usually requires intervention)
  auth_error: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    exponentialBackoff: false,
    jitterPercent: 0
  },
  // Default configuration
  default: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
    jitterPercent: 15
  }
};

/**
 * Classify API errors for proper handling
 */
export function classifyApiError(error: any, apiService: ApiError['apiService']): ApiError {
  let classification: ApiError = {
    code: "UNKNOWN_ERROR",
    message: error?.message || String(error),
    retryable: false,
    category: "unknown",
    apiService
  };

  // Extract HTTP status if available
  const httpStatus = error?.status || error?.response?.status || error?.code;
  if (httpStatus) {
    classification.httpStatus = typeof httpStatus === 'string' ? parseInt(httpStatus) : httpStatus;
  }

  // Google Classroom API specific errors
  if (apiService === "google_classroom") {
    return classifyGoogleClassroomError(error, classification);
  }

  // Google Forms API specific errors
  if (apiService === "google_forms") {
    return classifyGoogleFormsError(error, classification);
  }

  // Email service errors
  if (apiService === "email") {
    return classifyEmailError(error, classification);
  }

  // AI service errors
  if (apiService === "ai_service") {
    return classifyAiServiceError(error, classification);
  }

  // Generic HTTP error classification
  return classifyHttpError(error, classification);
}

/**
 * Google Classroom API error classification
 */
function classifyGoogleClassroomError(error: any, base: ApiError): ApiError {
  const status = base.httpStatus;
  const message = error?.message?.toLowerCase() || "";

  if (status === 401 || message.includes("unauthorized")) {
    return {
      ...base,
      code: "CLASSROOM_AUTH_ERROR",
      category: "authentication",
      retryable: false,
      message: "Authentication failed for Google Classroom API"
    };
  }

  if (status === 403) {
    if (message.includes("rate") || message.includes("quota")) {
      return {
        ...base,
        code: "CLASSROOM_RATE_LIMIT",
        category: "rate_limit",
        retryable: true,
        message: "Google Classroom API rate limit exceeded"
      };
    }
    return {
      ...base,
      code: "CLASSROOM_FORBIDDEN",
      category: "client",
      retryable: false,
      message: "Insufficient permissions for Google Classroom operation"
    };
  }

  if (status === 404) {
    return {
      ...base,
      code: "CLASSROOM_NOT_FOUND",
      category: "client",
      retryable: false,
      message: "Classroom resource not found"
    };
  }

  if (status >= 500) {
    return {
      ...base,
      code: "CLASSROOM_SERVER_ERROR",
      category: "server",
      retryable: true,
      message: "Google Classroom API server error"
    };
  }

  return classifyHttpError(error, base);
}

/**
 * Google Forms API error classification
 */
function classifyGoogleFormsError(error: any, base: ApiError): ApiError {
  const status = base.httpStatus;

  if (status === 401) {
    return {
      ...base,
      code: "FORMS_AUTH_ERROR",
      category: "authentication",
      retryable: false
    };
  }

  if (status === 403) {
    return {
      ...base,
      code: "FORMS_QUOTA_EXCEEDED",
      category: "rate_limit",
      retryable: true
    };
  }

  return classifyHttpError(error, base);
}

/**
 * Email service error classification
 */
function classifyEmailError(error: any, base: ApiError): ApiError {
  const message = error?.message?.toLowerCase() || "";

  if (message.includes("rate limit") || message.includes("throttle")) {
    return {
      ...base,
      code: "EMAIL_RATE_LIMIT",
      category: "rate_limit",
      retryable: true
    };
  }

  if (message.includes("auth") || message.includes("credential")) {
    return {
      ...base,
      code: "EMAIL_AUTH_ERROR",
      category: "authentication",
      retryable: false
    };
  }

  return classifyHttpError(error, base);
}

/**
 * AI service error classification
 */
function classifyAiServiceError(error: any, base: ApiError): ApiError {
  const status = base.httpStatus;
  const message = error?.message?.toLowerCase() || "";

  if (status === 429 || message.includes("rate limit")) {
    return {
      ...base,
      code: "AI_RATE_LIMIT",
      category: "rate_limit",
      retryable: true,
      message: "AI service rate limit exceeded"
    };
  }

  if (status === 401 || message.includes("api key")) {
    return {
      ...base,
      code: "AI_AUTH_ERROR",
      category: "authentication",
      retryable: false,
      message: "Invalid AI service API key"
    };
  }

  if (message.includes("token") || message.includes("context")) {
    return {
      ...base,
      code: "AI_CONTEXT_LIMIT",
      category: "client",
      retryable: false,
      message: "AI service context limit exceeded"
    };
  }

  return classifyHttpError(error, base);
}

/**
 * Generic HTTP error classification
 */
function classifyHttpError(error: any, base: ApiError): ApiError {
  const status = base.httpStatus;

  if (!status) {
    // Network errors without status codes
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("network") || message.includes("timeout") || message.includes("connection")) {
      return {
        ...base,
        code: "NETWORK_ERROR",
        category: "network",
        retryable: true
      };
    }
  }

  if (status >= 400 && status < 500) {
    // Client errors - generally not retryable except for specific cases
    const retryableClientErrors = [408, 429]; // Timeout, Too Many Requests
    return {
      ...base,
      code: `HTTP_${status}`,
      category: status === 429 ? "rate_limit" : "client",
      retryable: retryableClientErrors.includes(status)
    };
  }

  if (status >= 500) {
    // Server errors - generally retryable
    return {
      ...base,
      code: `HTTP_${status}`,
      category: "server",
      retryable: true
    };
  }

  return base;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attemptNumber: number, config: RetryConfig): number {
  let delay = config.baseDelay;

  if (config.exponentialBackoff) {
    // Exponential backoff: delay = baseDelay * (2 ^ attempt)
    delay = config.baseDelay * Math.pow(2, attemptNumber - 1);
  }

  // Apply maximum delay limit
  delay = Math.min(delay, config.maxDelay);

  // Add jitter to prevent thundering herd
  if (config.jitterPercent > 0) {
    const jitterRange = delay * (config.jitterPercent / 100);
    const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange
    delay = Math.max(100, delay + jitter); // Ensure minimum 100ms delay
  }

  return Math.round(delay);
}

/**
 * Execute operation with retry logic
 */
export const executeWithRetry = action({
  args: {
    operationName: v.string(),
    operationParams: v.any(),
    apiService: v.union(
      v.literal("google_classroom"),
      v.literal("google_forms"),
      v.literal("email"),
      v.literal("ai_service"),
      v.literal("general")
    ),
    retryConfigOverride: v.optional(v.object({
      maxAttempts: v.optional(v.number()),
      baseDelay: v.optional(v.number()),
      maxDelay: v.optional(v.number()),
      exponentialBackoff: v.optional(v.boolean()),
      jitterPercent: v.optional(v.number())
    })),
    operationId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const operationId = args.operationId || `${args.operationName}-${Date.now()}`;
    const attempts: OperationAttempt[] = [];

    // Get retry configuration
    let retryConfig = RETRY_CONFIGS.default;

    // Try to match specific config based on operation or service
    const possibleConfigs = [
      `${args.apiService}_error`,
      "default"
    ];

    for (const configKey of possibleConfigs) {
      if (RETRY_CONFIGS[configKey]) {
        retryConfig = RETRY_CONFIGS[configKey];
        break;
      }
    }

    // Apply any overrides
    if (args.retryConfigOverride) {
      retryConfig = { ...retryConfig, ...args.retryConfigOverride };
    }

    let lastError: ApiError | null = null;

    // Retry loop
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const attemptStart = Date.now();

      try {
        // Execute the actual operation
        const result = await executeOperation(args.operationName, args.operationParams);

        // Success - record attempt and return
        const attemptRecord: OperationAttempt = {
          attemptNumber: attempt,
          timestamp: attemptStart,
          success: true,
          responseTime: Date.now() - attemptStart
        };

        attempts.push(attemptRecord);

        // Store successful operation record
        await ctx.runMutation(api.apiErrorHandling.recordOperationResult, {
          operationId,
          operationName: args.operationName,
          success: true,
          attempts,
          totalTime: Date.now() - attempts[0].timestamp
        });

        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - attempts[0].timestamp
        };

      } catch (error) {
        // Classify the error
        const apiError = classifyApiError(error, args.apiService);
        lastError = apiError;

        const attemptRecord: OperationAttempt = {
          attemptNumber: attempt,
          timestamp: attemptStart,
          error: apiError,
          success: false,
          responseTime: Date.now() - attemptStart
        };

        attempts.push(attemptRecord);

        // Check if we should retry
        const shouldRetry = apiError.retryable && attempt < retryConfig.maxAttempts;

        if (shouldRetry) {
          // Calculate delay for next attempt
          const delay = calculateRetryDelay(attempt, retryConfig);
          attemptRecord.retryDelay = delay;

          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // No more retries - record failure and throw
          await ctx.runMutation(api.apiErrorHandling.recordOperationResult, {
            operationId,
            operationName: args.operationName,
            success: false,
            attempts,
            finalError: apiError,
            totalTime: Date.now() - attempts[0].timestamp
          });

          throw new Error(`Operation ${args.operationName} failed after ${attempt} attempts: ${apiError.message}`);
        }
      }
    }

    // This should never be reached, but just in case
    throw new Error(`Operation ${args.operationName} exhausted all retry attempts`);
  }
});

/**
 * Record operation results for monitoring and debugging
 */
export const recordOperationResult = mutation({
  args: {
    operationId: v.string(),
    operationName: v.string(),
    success: v.boolean(),
    attempts: v.array(v.object({
      attemptNumber: v.number(),
      timestamp: v.number(),
      error: v.optional(v.object({
        code: v.string(),
        message: v.string(),
        retryable: v.boolean(),
        category: v.string(),
        httpStatus: v.optional(v.number()),
        apiService: v.string()
      })),
      success: v.boolean(),
      responseTime: v.number(),
      retryDelay: v.optional(v.number())
    })),
    finalError: v.optional(v.object({
      code: v.string(),
      message: v.string(),
      retryable: v.boolean(),
      category: v.string(),
      httpStatus: v.optional(v.number()),
      apiService: v.string()
    })),
    totalTime: v.number()
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.insert("operationLogs", {
      operationId: args.operationId,
      operationName: args.operationName,
      timestamp: Date.now(),
      success: args.success,
      attempts: args.attempts,
      finalError: args.finalError,
      totalTime: args.totalTime,
      stats: {
        totalAttempts: args.attempts.length,
        totalRetries: args.attempts.length - 1,
        avgResponseTime: args.attempts.reduce((acc, att) => acc + att.responseTime, 0) / args.attempts.length,
        totalRetryDelay: args.attempts.reduce((acc, att) => acc + (att.retryDelay || 0), 0)
      }
    });

    return record;
  }
});

/**
 * Get operation statistics and health metrics
 */
export const getOperationHealth = query({
  args: {
    operationName: v.optional(v.string()),
    timeRange: v.optional(v.number()), // milliseconds
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || (24 * 60 * 60 * 1000); // Default: 24 hours
    const cutoffTime = Date.now() - timeRange;

    let query = ctx.db
      .query("operationLogs")
      .filter((q) => q.gte(q.field("timestamp"), cutoffTime));

    if (args.operationName) {
      query = query.filter((q) => q.eq(q.field("operationName"), args.operationName));
    }

    const logs = await query
      .order("desc")
      .take(args.limit || 100);

    // Calculate health metrics
    const totalOperations = logs.length;
    const successfulOperations = logs.filter(log => log.success).length;
    const failedOperations = totalOperations - successfulOperations;

    const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0;
    const avgResponseTime = logs.length > 0
      ? logs.reduce((acc, log) => acc + (log.stats.avgResponseTime || 0), 0) / logs.length
      : 0;

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    logs.filter(log => !log.success && log.finalError).forEach(log => {
      const errorCode = log.finalError!.code;
      errorBreakdown[errorCode] = (errorBreakdown[errorCode] || 0) + 1;
    });

    // Retry statistics
    const retryStats = {
      totalRetries: logs.reduce((acc, log) => acc + log.stats.totalRetries, 0),
      avgRetriesPerOperation: logs.length > 0
        ? logs.reduce((acc, log) => acc + log.stats.totalRetries, 0) / logs.length
        : 0,
      operationsWithRetries: logs.filter(log => log.stats.totalRetries > 0).length
    };

    return {
      timeRange: {
        start: new Date(cutoffTime).toISOString(),
        end: new Date().toISOString(),
        durationMs: timeRange
      },
      totalOperations,
      successfulOperations,
      failedOperations,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      errorBreakdown,
      retryStats,
      recentFailures: logs
        .filter(log => !log.success)
        .slice(0, 10)
        .map(log => ({
          operationId: log.operationId,
          operationName: log.operationName,
          timestamp: new Date(log.timestamp).toISOString(),
          error: log.finalError?.code,
          attempts: log.stats.totalAttempts
        }))
    };
  }
});

// ============================================
// OPERATION EXECUTION MOCK
// ============================================

/**
 * Mock operation execution - replace with actual service calls
 */
async function executeOperation(operationName: string, params: any): Promise<any> {
  // This is where you would implement actual API calls
  // For now, we'll simulate different types of operations

  if (operationName.includes("classroom")) {
    return simulateClassroomOperation(params);
  }

  if (operationName.includes("email")) {
    return simulateEmailOperation(params);
  }

  if (operationName.includes("ai")) {
    return simulateAiOperation(params);
  }

  return { success: true, data: params };
}

async function simulateClassroomOperation(params: any): Promise<any> {
  // Simulate various failure scenarios for testing
  const random = Math.random();

  if (random < 0.1) {
    // 10% chance of rate limiting
    const error = new Error("Rate limit exceeded");
    (error as any).status = 429;
    throw error;
  }

  if (random < 0.15) {
    // 5% chance of server error
    const error = new Error("Internal server error");
    (error as any).status = 500;
    throw error;
  }

  if (random < 0.17) {
    // 2% chance of network error
    throw new Error("Network connection failed");
  }

  // 83% success rate
  return {
    success: true,
    classroomResponse: {
      courseId: params.courseId,
      operation: "completed",
      timestamp: new Date().toISOString()
    }
  };
}

async function simulateEmailOperation(params: any): Promise<any> {
  const random = Math.random();

  if (random < 0.05) {
    throw new Error("Email service rate limit exceeded");
  }

  return {
    success: true,
    messageId: `email-${Date.now()}`,
    recipient: params.recipient
  };
}

async function simulateAiOperation(params: any): Promise<any> {
  const random = Math.random();

  if (random < 0.08) {
    const error = new Error("AI service rate limit");
    (error as any).status = 429;
    throw error;
  }

  return {
    success: true,
    aiResponse: {
      result: "AI processing completed",
      confidence: 0.95
    }
  };
}