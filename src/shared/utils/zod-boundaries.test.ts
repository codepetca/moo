import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  safeParse,
  safeParseOrThrow,
  asEnum,
  coerceDateMs,
  formatZodError,
  type ParseResult,
} from './zod-boundaries';

describe('safeParse', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
    email: z.string().email(),
  });

  it('should return success result for valid data', () => {
    const validData = {
      name: 'John Doe',
      age: 25,
      email: 'john@example.com',
    };

    const result = safeParse(TestSchema, validData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should return error result for invalid data', () => {
    const invalidData = {
      name: '', // Invalid: empty string
      age: -5, // Invalid: negative
      email: 'not-an-email', // Invalid: not email format
    };

    const result = safeParse(TestSchema, invalidData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('name');
      expect(result.error).toContain('age');
      expect(result.error).toContain('email');
      expect(result.details).toBeDefined();
    }
  });

  it('should handle null and undefined inputs', () => {
    const nullResult = safeParse(TestSchema, null);
    expect(nullResult.ok).toBe(false);

    const undefinedResult = safeParse(TestSchema, undefined);
    expect(undefinedResult.ok).toBe(false);
  });

  it('should provide detailed error information', () => {
    const result = safeParse(TestSchema, { name: '', age: 'not-a-number', email: 'invalid' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details?.issues).toBeDefined();
      expect(result.details?.issues.length).toBeGreaterThan(0);
    }
  });

  it('should work with primitive schemas', () => {
    const StringSchema = z.string().min(1);

    const validResult = safeParse(StringSchema, 'hello');
    expect(validResult.ok).toBe(true);

    const invalidResult = safeParse(StringSchema, '');
    expect(invalidResult.ok).toBe(false);
  });

  it('should work with nested schemas', () => {
    const NestedSchema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string(),
          settings: z.object({
            theme: z.enum(['light', 'dark']),
          }),
        }),
      }),
    });

    const validData = {
      user: {
        profile: {
          name: 'John',
          settings: {
            theme: 'dark' as const,
          },
        },
      },
    };

    const result = safeParse(NestedSchema, validData);
    expect(result.ok).toBe(true);

    const invalidData = {
      user: {
        profile: {
          name: 'John',
          settings: {
            theme: 'invalid',
          },
        },
      },
    };

    const invalidResult = safeParse(NestedSchema, invalidData);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect(invalidResult.error).toContain('user.profile.settings.theme');
    }
  });
});

describe('safeParseOrThrow', () => {
  const TestSchema = z.object({
    value: z.number().positive(),
  });

  it('should return parsed data for valid input', () => {
    const validData = { value: 42 };
    const result = safeParseOrThrow(TestSchema, validData);
    expect(result).toEqual(validData);
  });

  it('should throw error for invalid input', () => {
    const invalidData = { value: -1 };
    expect(() => safeParseOrThrow(TestSchema, invalidData)).toThrow();
  });

  it('should throw error with formatted message', () => {
    const invalidData = { value: 'not-a-number' };
    try {
      safeParseOrThrow(TestSchema, invalidData);
    } catch (error: any) {
      expect(error.message).toContain('value');
    }
  });

  it('should work with complex validation errors', () => {
    const ComplexSchema = z.object({
      nested: z.object({
        array: z.array(z.object({
          id: z.string().uuid(),
          count: z.number().int().positive(),
        })),
      }),
    });

    const invalidData = {
      nested: {
        array: [
          { id: 'not-a-uuid', count: -1 },
          { id: 'also-not-uuid', count: 'not-a-number' },
        ],
      },
    };

    expect(() => safeParseOrThrow(ComplexSchema, invalidData)).toThrow();
  });
});

describe('asEnum', () => {
  it('should create enum schema from string array', () => {
    const values = ['red', 'green', 'blue'] as const;
    const ColorEnum = asEnum(values);

    expect(() => ColorEnum.parse('red')).not.toThrow();
    expect(() => ColorEnum.parse('green')).not.toThrow();
    expect(() => ColorEnum.parse('blue')).not.toThrow();
    expect(() => ColorEnum.parse('yellow')).toThrow();
  });

  it('should work with readonly arrays', () => {
    const statuses = ['pending', 'processing', 'completed'] as const;
    const StatusEnum = asEnum(statuses);

    expect(StatusEnum.parse('pending')).toBe('pending');
    expect(StatusEnum.parse('completed')).toBe('completed');
  });

  it('should handle single-value enum', () => {
    const singleValue = ['only'] as const;
    const SingleEnum = asEnum(singleValue);

    expect(() => SingleEnum.parse('only')).not.toThrow();
    expect(() => SingleEnum.parse('other')).toThrow();
  });

  it('should maintain type safety', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'] as const;
    const MethodEnum = asEnum(methods);

    const parsed = MethodEnum.parse('GET');
    // TypeScript should infer the correct type
    const _typeCheck: 'GET' | 'POST' | 'PUT' | 'DELETE' = parsed;
    expect(parsed).toBe('GET');
  });
});

describe('coerceDateMs', () => {
  it('should convert Date objects to milliseconds', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = coerceDateMs.parse(date);
    expect(result).toBe(date.getTime());
    expect(typeof result).toBe('number');
  });

  it('should parse ISO date strings to milliseconds', () => {
    const isoString = '2024-01-15T10:30:00.000Z';
    const result = coerceDateMs.parse(isoString);
    expect(result).toBe(new Date(isoString).getTime());
  });

  it('should pass through valid timestamps', () => {
    const timestamp = 1705392600000; // Unix timestamp
    const result = coerceDateMs.parse(timestamp);
    expect(result).toBe(timestamp);
  });

  it('should reject invalid date strings', () => {
    expect(() => coerceDateMs.parse('not-a-date')).toThrow();
    expect(() => coerceDateMs.parse('2024-13-45')).toThrow(); // Invalid date
  });

  it('should reject negative timestamps', () => {
    expect(() => coerceDateMs.parse(-1)).toThrow();
  });

  it('should reject non-finite numbers', () => {
    expect(() => coerceDateMs.parse(NaN)).toThrow();
    expect(() => coerceDateMs.parse(Infinity)).toThrow();
    expect(() => coerceDateMs.parse(-Infinity)).toThrow();
  });

  it('should handle edge cases', () => {
    // Unix epoch
    const epoch = coerceDateMs.parse(0);
    expect(epoch).toBe(0);

    // Recent timestamp
    const recent = Date.now();
    const result = coerceDateMs.parse(recent);
    expect(result).toBe(recent);
  });

  it('should work in schema compositions', () => {
    const EventSchema = z.object({
      name: z.string(),
      timestamp: coerceDateMs,
    });

    const validEvent = {
      name: 'Meeting',
      timestamp: new Date('2024-01-15T10:30:00.000Z'),
    };

    const result = EventSchema.parse(validEvent);
    expect(typeof result.timestamp).toBe('number');
    expect(result.timestamp).toBeGreaterThan(0);
  });
});

describe('formatZodError', () => {
  it('should format single field error', () => {
    const schema = z.object({ name: z.string().min(1) });
    try {
      schema.parse({ name: '' });
    } catch (error: any) {
      const formatted = formatZodError(error);
      expect(formatted).toContain('name');
      expect(formatted).toContain('Too small'); // Actual Zod error message
    }
  });

  it('should format multiple field errors', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
      email: z.string().email(),
    });

    try {
      schema.parse({ name: '', age: -1, email: 'invalid' });
    } catch (error: any) {
      const formatted = formatZodError(error);
      expect(formatted).toContain('name');
      expect(formatted).toContain('age');
      expect(formatted).toContain('email');
      expect(formatted.split(';')).toHaveLength(3);
    }
  });

  it('should format nested field errors', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(1),
        }),
      }),
    });

    try {
      schema.parse({ user: { profile: { name: '' } } });
    } catch (error: any) {
      const formatted = formatZodError(error);
      expect(formatted).toContain('user.profile.name');
    }
  });

  it('should format array errors with indices', () => {
    const schema = z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        value: z.number().positive(),
      })),
    });

    try {
      schema.parse({
        items: [
          { id: 'not-a-uuid', value: -1 },
          { id: 'also-invalid', value: 0 },
        ],
      });
    } catch (error: any) {
      const formatted = formatZodError(error);
      expect(formatted).toContain('items.0.id');
      expect(formatted).toContain('items.0.value');
      expect(formatted).toContain('items.1.id');
    }
  });

  it('should handle root-level errors', () => {
    const schema = z.string();
    try {
      schema.parse(123);
    } catch (error: any) {
      const formatted = formatZodError(error);
      expect(formatted).toContain('<root>');
    }
  });

  it('should join multiple errors with semicolons', () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
    });

    try {
      schema.parse({ a: 1, b: 2, c: 3 });
    } catch (error: any) {
      const formatted = formatZodError(error);
      const parts = formatted.split(';');
      expect(parts).toHaveLength(3);
      expect(parts[0].trim()).toContain('a:');
      expect(parts[1].trim()).toContain('b:');
      expect(parts[2].trim()).toContain('c:');
    }
  });

  it('should handle custom error messages', () => {
    const schema = z.string().min(5, 'Name must be at least 5 characters');
    try {
      schema.parse('hi');
    } catch (error: any) {
      const formatted = formatZodError(error);
      expect(formatted).toContain('Name must be at least 5 characters');
    }
  });
});

describe('Integration with Complex Schemas', () => {
  it('should work with classroom schema boundary', () => {
    const ClassroomBoundarySchema = z.object({
      classroom: z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        createdAt: coerceDateMs,
        state: asEnum(['active', 'archived'] as const),
      }),
      metadata: z.object({
        syncedAt: coerceDateMs,
        source: z.literal('google_classroom'),
      }),
    });

    const validData = {
      classroom: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Class',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        state: 'active' as const,
      },
      metadata: {
        syncedAt: Date.now(),
        source: 'google_classroom' as const,
      },
    };

    const result = safeParse(ClassroomBoundarySchema, validData);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(typeof result.data.classroom.createdAt).toBe('number');
      expect(typeof result.data.metadata.syncedAt).toBe('number');
    }
  });

  it('should work with AI grading boundary schema', () => {
    const AIBoundarySchema = z.object({
      request: z.object({
        questionId: z.string(),
        response: z.string(),
        gradingMethod: asEnum(['auto', 'ai', 'manual'] as const),
        submittedAt: coerceDateMs,
      }),
      config: z.object({
        aiProvider: asEnum(['gemini', 'claude', 'openai'] as const),
        confidenceThreshold: z.number().min(0).max(1),
        maxCost: z.number().positive(),
      }),
    });

    const testData = {
      request: {
        questionId: 'q123',
        response: 'Student answer here',
        gradingMethod: 'ai' as const,
        submittedAt: '2024-01-15T10:30:00.000Z',
      },
      config: {
        aiProvider: 'gemini' as const,
        confidenceThreshold: 0.8,
        maxCost: 0.05,
      },
    };

    const result = safeParse(AIBoundarySchema, testData);
    expect(result.ok).toBe(true);
  });

  it('should handle complex validation error scenarios', () => {
    const ComplexSchema = z.object({
      users: z.array(z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        profile: z.object({
          createdAt: coerceDateMs,
          status: asEnum(['active', 'inactive'] as const),
        }),
      })),
      settings: z.object({
        updatedAt: coerceDateMs,
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
      }),
    });

    const invalidData = {
      users: [
        {
          id: 'not-uuid',
          email: 'not-email',
          profile: {
            createdAt: 'invalid-date',
            status: 'invalid-status',
          },
        },
      ],
      settings: {
        updatedAt: -1,
        version: 'not-semver',
      },
    };

    const result = safeParse(ComplexSchema, invalidData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('users.0.id');
      expect(result.error).toContain('users.0.email');
      expect(result.error).toContain('users.0.profile.createdAt');
      expect(result.error).toContain('users.0.profile.status');
      expect(result.error).toContain('settings.updatedAt');
      expect(result.error).toContain('settings.version');
    }
  });
});