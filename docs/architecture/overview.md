# 🏗️ System Architecture Overview

## High-Level Architecture

**moo** follows a schema-first, multi-tenant architecture with strict boundaries between components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Google APIs   │    │   Apps Script    │    │     Convex      │
│                 │◄──►│                  │◄──►│    Backend      │
│ • Classroom     │    │ • Schema Validation │   │ • Real-time DB  │
│ • Forms         │    │ • Data Transform   │   │ • TypeScript    │
│ • OAuth         │    │ • WebApp UI        │   │ • Auto-scaling  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         ▲
                                                         │
                                                ┌─────────────────┐
                                                │   React App     │
                                                │                 │
                                                │ • Teacher UI    │
                                                │ • Student UI    │
                                                │ • TailwindCSS   │
                                                │ • Real-time     │
                                                └─────────────────┘
```

## Component Responsibilities

### 1. Google Apps Script Layer
**Purpose**: Secure bridge between Google Workspace and Convex

- **Google API Access**: Runs inside school Google account with proper permissions
- **Schema Validation**: Validates all Google API responses before forwarding
- **Data Transformation**: Normalizes Google data to internal schemas
- **WebApp Interface**: Teacher setup and configuration UI
- **Error Handling**: Robust retry logic and error reporting

### 2. Convex Backend Layer
**Purpose**: Real-time, scalable serverless backend

- **Database**: Auto-scaling document database with strong consistency
- **Functions**: TypeScript cloud functions with automatic type generation
- **Real-time**: Live updates pushed to React frontend
- **Schema Enforcement**: Server-side validation of all mutations
- **Authentication**: Integration with external auth providers

### 3. React Frontend Layer
**Purpose**: Multi-tenant user interface

- **Teacher Dashboard**: Classroom management, grading, analytics
- **Student Portal**: Assignment viewing, grade checking, feedback
- **Responsive Design**: TailwindCSS-based components for all devices
- **Real-time Updates**: Live data synchronization via Convex
- **Type Safety**: End-to-end TypeScript with generated types

## Data Flow Architecture

### Schema-First Boundaries

Every system boundary enforces strict schemas:

```typescript
// Apps Script → Convex
interface ClassroomSyncPayload {
  classrooms: ClassroomData[];
  assignments: AssignmentData[];
  submissions: SubmissionData[];
  timestamp: number;
}

// Convex → React
interface DashboardQuery {
  userId: string;
  role: "teacher" | "student";
  classroomId?: string;
}
```

### Multi-Tenant Data Isolation

```
User Authentication
        ↓
Role-Based Access Control
        ↓
Data Filtering by User Context
        ↓
UI Personalization
```

## Security Architecture

### Authentication Flow
1. **Google OAuth**: Single sign-on with school domain restrictions
2. **JWT Tokens**: Secure session management
3. **Role Assignment**: Teacher/Student role based on Google Classroom
4. **Permission Enforcement**: Function-level access control

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Isolation**: Strict tenant isolation in database queries
- **Audit Logging**: Comprehensive access and modification logs
- **FERPA Compliance**: Educational data privacy requirements

## Scalability Design

### Horizontal Scaling
- **Convex Functions**: Auto-scale based on demand
- **Database**: Automatic sharding and replication
- **CDN**: Static asset distribution
- **Caching**: Intelligent query result caching

### Performance Optimization
- **Real-time Updates**: Efficient WebSocket connections
- **Batch Processing**: Bulk grading operations
- **Lazy Loading**: Progressive data loading in UI
- **Schema Validation**: Optimized validation at boundaries

## Development Architecture

### Schema-First Development
1. **Define Schemas**: Start with TypeScript/Zod schemas
2. **Generate Types**: Auto-generate frontend types from backend
3. **Implement Functions**: Build with schema validation
4. **Test Boundaries**: Validate all data transformations

### Test-Driven Development
1. **Integration Tests**: Test complete data flow
2. **Unit Tests**: Individual component testing
3. **E2E Tests**: Full user workflow validation
4. **Schema Tests**: Boundary validation testing

## Monitoring & Observability

### Real-time Monitoring
- **Function Performance**: Latency and error rate tracking
- **Database Health**: Query performance and capacity
- **User Activity**: Real-time usage analytics
- **Error Tracking**: Comprehensive error logging and alerting

### Business Metrics
- **Grading Throughput**: Assignments processed per hour
- **User Engagement**: Teacher and student activity levels
- **System Reliability**: Uptime and availability metrics
- **Data Quality**: Schema validation success rates