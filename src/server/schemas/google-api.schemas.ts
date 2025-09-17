import { z } from 'zod';

/**
 * Google APIs Schema Definitions
 * Validates data from Google Classroom and Google Forms APIs
 */

// Google API Error Schema
export const GoogleApiErrorSchema = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
    status: z.string(),
    details: z.array(z.any()).optional(),
  }),
});

// Google Classroom Course Schema (from API)
export const GoogleCourseSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string().optional(),
  descriptionHeading: z.string().optional(),
  description: z.string().optional(),
  room: z.string().optional(),
  ownerId: z.string(),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  enrollmentCode: z.string().optional(),
  courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
  alternateLink: z.string().url(),
  teacherGroupEmail: z.string().email().optional(),
  courseGroupEmail: z.string().email().optional(),
  teacherFolder: z.object({
    id: z.string(),
    title: z.string(),
    alternateLink: z.string().url(),
  }).optional(),
  guardiansEnabled: z.boolean().optional(),
  calendarId: z.string().optional(),
});

// Google Classroom CourseWork Schema
export const GoogleCourseWorkSchema = z.object({
  courseId: z.string(),
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  materials: z.array(z.any()).optional(),
  state: z.enum(['PUBLISHED', 'DRAFT', 'DELETED']),
  alternateLink: z.string().url(),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  dueDate: z.object({
    year: z.number(),
    month: z.number(),
    day: z.number(),
  }).optional(),
  dueTime: z.object({
    hours: z.number(),
    minutes: z.number(),
    seconds: z.number().optional(),
    nanos: z.number().optional(),
  }).optional(),
  maxPoints: z.number().optional(),
  workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']),
  associatedWithDeveloper: z.boolean().optional(),
  assigneeMode: z.enum(['ALL_STUDENTS', 'INDIVIDUAL_STUDENTS']).optional(),
  individualStudentsOptions: z.object({
    studentIds: z.array(z.string()),
  }).optional(),
  submissionModificationMode: z.enum(['MODIFIABLE_UNTIL_TURNED_IN', 'MODIFIABLE']).optional(),
  creatorUserId: z.string(),
  topicId: z.string().optional(),
});

// Google Classroom StudentSubmission Schema
export const GoogleStudentSubmissionSchema = z.object({
  courseId: z.string(),
  courseWorkId: z.string(),
  id: z.string(),
  userId: z.string(),
  creationTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  state: z.enum(['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT']),
  late: z.boolean().optional(),
  draftGrade: z.number().optional(),
  assignedGrade: z.number().optional(),
  alternateLink: z.string().url(),
  courseWorkType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']).optional(),
  associatedWithDeveloper: z.boolean().optional(),
  assignmentSubmission: z.object({
    attachments: z.array(z.any()).optional(),
  }).optional(),
  shortAnswerSubmission: z.object({
    answer: z.string(),
  }).optional(),
  multipleChoiceSubmission: z.object({
    answer: z.string(),
  }).optional(),
  submissionHistory: z.array(z.object({
    stateHistory: z.object({
      state: z.enum(['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT']),
      stateTimestamp: z.string().datetime(),
      actorUserId: z.string().optional(),
    }),
  })).optional(),
});

// Google Forms Schema
export const GoogleFormSchema = z.object({
  formId: z.string(),
  info: z.object({
    title: z.string(),
    description: z.string().optional(),
    documentTitle: z.string().optional(),
  }),
  settings: z.object({
    quizSettings: z.object({
      isQuiz: z.boolean().optional(),
    }).optional(),
  }).optional(),
  items: z.array(z.object({
    itemId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    questionItem: z.object({
      question: z.object({
        questionId: z.string(),
        required: z.boolean().optional(),
        grading: z.object({
          pointValue: z.number(),
          correctAnswers: z.object({
            answers: z.array(z.object({
              value: z.string(),
            })),
          }).optional(),
          whenRight: z.object({
            feedback: z.object({
              text: z.string(),
            }),
          }).optional(),
          whenWrong: z.object({
            feedback: z.object({
              text: z.string(),
            }),
          }).optional(),
        }).optional(),
        choiceQuestion: z.object({
          type: z.enum(['RADIO', 'CHECKBOX']),
          options: z.array(z.object({
            value: z.string(),
            image: z.object({
              contentUri: z.string().url(),
              altText: z.string().optional(),
            }).optional(),
            isOther: z.boolean().optional(),
          })),
          shuffle: z.boolean().optional(),
        }).optional(),
        textQuestion: z.object({
          paragraph: z.boolean().optional(),
        }).optional(),
        scaleQuestion: z.object({
          low: z.number(),
          high: z.number(),
          lowLabel: z.string().optional(),
          highLabel: z.string().optional(),
        }).optional(),
        dateQuestion: z.object({
          includeTime: z.boolean().optional(),
          includeYear: z.boolean().optional(),
        }).optional(),
        timeQuestion: z.object({
          duration: z.boolean().optional(),
        }).optional(),
        fileUploadQuestion: z.object({
          folderId: z.string(),
          types: z.array(z.enum(['PDF', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'PRESENTATION', 'SPREADSHEET'])),
          maxFiles: z.number().optional(),
          maxFileSize: z.number().optional(),
        }).optional(),
      }),
    }).optional(),
  })),
  linkedSheetId: z.string().optional(),
  revisionId: z.string(),
});

// Google Forms Response Schema
export const GoogleFormResponseSchema = z.object({
  formId: z.string(),
  responseId: z.string(),
  createTime: z.string().datetime(),
  lastSubmittedTime: z.string().datetime(),
  respondentEmail: z.string().email().optional(),
  answers: z.record(z.object({
    questionId: z.string(),
    textAnswers: z.object({
      answers: z.array(z.object({
        value: z.string(),
      })),
    }).optional(),
    fileUploadAnswers: z.object({
      answers: z.array(z.object({
        fileId: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      })),
    }).optional(),
  })),
});

// Apps Script sync payload schemas
export const AppsScriptSyncPayloadSchema = z.object({
  operation: z.enum(['classroom_sync', 'assignment_sync', 'submission_sync', 'form_sync']),
  timestamp: z.number().int().positive(),
  userId: z.string().email(),
  data: z.object({
    courses: z.array(GoogleCourseSchema).optional(),
    courseWork: z.array(GoogleCourseWorkSchema).optional(),
    submissions: z.array(GoogleStudentSubmissionSchema).optional(),
    forms: z.array(GoogleFormSchema).optional(),
    responses: z.array(GoogleFormResponseSchema).optional(),
  }),
  metadata: z.object({
    syncSource: z.literal('google_apps_script'),
    version: z.string(),
    totalRecords: z.number().int().nonnegative(),
    syncDuration: z.number().positive().optional(),
  }),
});

// Google API List Response Schema (generic)
export const GoogleListResponseSchema = z.object({
  items: z.array(z.any()).optional(),
  nextPageToken: z.string().optional(),
});

// Google API Batch Request Schema
export const GoogleBatchRequestSchema = z.object({
  requests: z.array(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  })),
});

// Type exports
export type GoogleApiError = z.infer<typeof GoogleApiErrorSchema>;
export type GoogleCourse = z.infer<typeof GoogleCourseSchema>;
export type GoogleCourseWork = z.infer<typeof GoogleCourseWorkSchema>;
export type GoogleStudentSubmission = z.infer<typeof GoogleStudentSubmissionSchema>;
export type GoogleForm = z.infer<typeof GoogleFormSchema>;
export type GoogleFormResponse = z.infer<typeof GoogleFormResponseSchema>;
export type AppsScriptSyncPayload = z.infer<typeof AppsScriptSyncPayloadSchema>;
export type GoogleListResponse = z.infer<typeof GoogleListResponseSchema>;
export type GoogleBatchRequest = z.infer<typeof GoogleBatchRequestSchema>;

// Validation helpers
export function validateGoogleCourse(data: unknown): GoogleCourse {
  return GoogleCourseSchema.parse(data);
}

export function validateGoogleCourseWork(data: unknown): GoogleCourseWork {
  return GoogleCourseWorkSchema.parse(data);
}

export function validateGoogleForm(data: unknown): GoogleForm {
  return GoogleFormSchema.parse(data);
}

export function validateAppsScriptPayload(data: unknown): AppsScriptSyncPayload {
  return AppsScriptSyncPayloadSchema.parse(data);
}

export function isValidGoogleApiResponse(data: unknown): boolean {
  const errorResult = GoogleApiErrorSchema.safeParse(data);
  return !errorResult.success; // Valid if it's NOT an error
}

// Helper functions for Google API data processing
export function extractGoogleApiError(data: unknown): GoogleApiError | null {
  const result = GoogleApiErrorSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function normalizeGoogleDateTime(googleDateTime: string): Date {
  return new Date(googleDateTime);
}

export function formatDateForGoogle(date: Date): string {
  return date.toISOString();
}

// Google API rate limiting and error handling
export const GoogleApiRetryConfigSchema = z.object({
  maxRetries: z.number().int().positive().max(5).default(3),
  backoffMultiplier: z.number().positive().default(2),
  initialDelay: z.number().positive().default(1000),
  maxDelay: z.number().positive().default(30000),
  retryableErrors: z.array(z.number()).default([429, 500, 502, 503, 504]),
});

export type GoogleApiRetryConfig = z.infer<typeof GoogleApiRetryConfigSchema>;