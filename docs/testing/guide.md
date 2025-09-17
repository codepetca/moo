# 🧪 Testing Guide - Schema-First TDD

## Testing Philosophy

**moo** follows a comprehensive test-driven development approach with schema validation at every boundary. All tests are written **before** implementation to ensure robust, reliable autograding for educational environments.

## Testing Strategy

### 1. Schema Validation Tests
**First Priority**: Validate all system boundaries

```typescript
// Example: Apps Script → Convex boundary test
describe('ClassroomSync Schema', () => {
  it('validates Google Classroom API response', () => {
    const googleClassroomData = mockGoogleClassroomResponse();
    const result = ClassroomSyncSchema.safeParse(googleClassroomData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid data structure', () => {
    const invalidData = { malformed: 'data' };
    const result = ClassroomSyncSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### 2. Unit Tests (Vitest)
**Components and Pure Functions**

```typescript
// Example: React component test
describe('AssignmentPanel', () => {
  it('renders assignment data correctly', () => {
    const assignment = createMockAssignment();
    render(<AssignmentPanel assignment={assignment} />);
    expect(screen.getByText(assignment.title)).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<AssignmentPanel assignment={null} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### 3. Integration Tests (Convex)
**Backend Function Testing**

```typescript
// Example: Convex function integration test
describe('autograding functions', () => {
  it('grades multiple choice questions correctly', async () => {
    const submission = await ctx.runMutation(api.autograding.submitResponse, {
      assignmentId: testAssignmentId,
      responses: [{ questionId: 'q1', response: 'B' }]
    });

    const result = await ctx.runAction(api.autograding.gradeSubmission, {
      submissionId: submission
    });

    expect(result.score).toBe(10);
    expect(result.feedback).toContain('Correct answer');
  });
});
```

### 4. E2E Tests (Playwright)
**Complete User Workflows**

```typescript
// Example: Teacher workflow test
test('teacher can create and grade assignment', async ({ page }) => {
  await page.goto('/teacher/dashboard');

  // Create assignment
  await page.click('[data-testid="create-assignment"]');
  await page.fill('[data-testid="assignment-title"]', 'Math Quiz 1');
  await page.click('[data-testid="save-assignment"]');

  // Verify assignment appears
  await expect(page.locator('[data-testid="assignment-list"]'))
    .toContainText('Math Quiz 1');

  // Grade submissions
  await page.click('[data-testid="grade-submissions"]');
  await expect(page.locator('[data-testid="grading-progress"]'))
    .toBeVisible();
});
```

## Test Structure

### Test Organization
```
tests/
├── unit/                   # Vitest unit tests
│   ├── components/         # React component tests
│   ├── utils/             # Utility function tests
│   └── schemas/           # Schema validation tests
├── integration/           # Convex integration tests
│   ├── autograding/       # Grading function tests
│   ├── classroomSync/     # Google integration tests
│   └── database/          # Database operation tests
├── e2e/                   # Playwright E2E tests
│   ├── teacher/           # Teacher workflow tests
│   ├── student/           # Student workflow tests
│   └── admin/             # Administrative tests
└── fixtures/              # Test data and mocks
    ├── google-api/        # Mock Google API responses
    ├── assignments/       # Sample assignments
    └── submissions/       # Sample student submissions
```

## TDD Workflow

### Red-Green-Refactor Cycle

1. **Red**: Write failing test
```typescript
test('should validate assignment schema', () => {
  const assignment = createMockAssignment();
  const result = AssignmentSchema.safeParse(assignment);
  expect(result.success).toBe(true); // FAILS - schema not implemented yet
});
```

2. **Green**: Implement minimal code to pass
```typescript
const AssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  // ... minimal implementation
});
```

3. **Refactor**: Improve while maintaining tests
```typescript
const AssignmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  maxPoints: z.number().positive(),
  // ... enhanced with validation rules
});
```

## Schema-First Testing

### Boundary Validation
Every system boundary must have schema tests:

```typescript
describe('Google Classroom Integration', () => {
  it('validates incoming classroom data', () => {
    const googleData = loadFixture('google-classroom-response.json');
    const normalized = normalizeClassroomData(googleData);

    expect(ClassroomSchema.safeParse(normalized).success).toBe(true);
  });

  it('handles malformed Google API responses', () => {
    const malformedData = { incomplete: 'data' };

    expect(() => normalizeClassroomData(malformedData))
      .toThrow('Invalid classroom data structure');
  });
});
```

### Type Safety Testing
```typescript
// Ensure TypeScript types match runtime schemas
describe('Type Safety', () => {
  it('assignment types match runtime schema', () => {
    const assignment: Assignment = createMockAssignment();
    const parseResult = AssignmentSchema.safeParse(assignment);

    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expectTypeOf(parseResult.data).toEqualTypeOf<Assignment>();
    }
  });
});
```

## Test Data Management

### Fixtures and Mocks
```typescript
// fixtures/assignments.ts
export const mockAssignments = {
  mathQuiz: {
    id: 'math-quiz-1',
    title: 'Algebra Basics',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        text: 'What is 2 + 2?',
        choices: ['3', '4', '5', '6'],
        correctAnswer: '4'
      }
    ]
  }
};

// Use in tests
const assignment = mockAssignments.mathQuiz;
```

### Database Test Isolation
```typescript
// Ensure each test has clean state
beforeEach(async () => {
  await ctx.runMutation(api.testing.clearTestData);
  await ctx.runMutation(api.testing.seedTestData, { scenario: 'basic' });
});
```

## Performance Testing

### Load Testing
```typescript
describe('Batch Grading Performance', () => {
  it('handles 1000 submissions efficiently', async () => {
    const submissions = createMockSubmissions(1000);

    const startTime = Date.now();
    await ctx.runAction(api.batchGrading.gradeSubmissions, {
      submissions
    });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30000); // 30 seconds max
  });
});
```

### Memory Usage
```typescript
it('processes large assignments without memory leaks', async () => {
  const initialMemory = process.memoryUsage().heapUsed;

  for (let i = 0; i < 100; i++) {
    await processLargeAssignment();
  }

  global.gc(); // Force garbage collection
  const finalMemory = process.memoryUsage().heapUsed;

  expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // 10MB max increase
});
```

## Continuous Testing

### Pre-commit Hooks
```bash
# .husky/pre-commit
npm run test:unit
npm run test:integration
npm run type-check
npm run lint
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - name: Unit Tests
      run: npm run test:unit

    - name: Integration Tests
      run: npm run test:integration

    - name: E2E Tests
      run: npm run test:e2e

    - name: Schema Validation
      run: npm run test:schemas
```

## Test Commands

```bash
# Unit tests (fast feedback)
npm run test                    # Run all unit tests
npm run test:watch             # Watch mode for TDD
npm run test:coverage          # Coverage report

# Integration tests (backend functions)
npm run test:integration       # Convex function tests
npm run test:integration:watch # Watch mode

# E2E tests (complete workflows)
npm run test:e2e              # Full E2E suite
npm run test:e2e:headed       # With browser UI
npm run test:e2e:debug        # Debug mode

# Schema validation
npm run test:schemas          # All schema tests
npm run test:boundaries       # Boundary validation

# Performance tests
npm run test:performance      # Load and stress tests
npm run test:memory          # Memory usage tests

# All tests
npm run test:all             # Complete test suite
npm run test:ci              # CI-optimized test run
```

This comprehensive testing approach ensures **moo** maintains the reliability required for educational environments while supporting rapid, confident development.