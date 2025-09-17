import { z } from 'zod';

/**
 * User and Authentication Schemas
 * Handles user data, preferences, and authentication
 */

// User role enum
export const UserRoleSchema = z.enum(['teacher', 'student', 'admin']);

// User schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Must be a valid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  role: UserRoleSchema,
  avatar: z.string().url().optional(),
  googleId: z.string().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  lastActiveAt: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  // Domain restrictions for schools
  domain: z.string().optional(),
  schoolId: z.string().optional(),
  department: z.string().optional(),
});

// User preferences schema
export const UserPreferencesSchema = z.object({
  autoGradeOnSubmission: z.boolean().default(true),
  sendGradesToClassroom: z.boolean().default(true),
  notifyOnNewSubmissions: z.boolean().default(true),
  defaultPartialCredit: z.boolean().default(false),
  defaultCaseSensitive: z.boolean().default(false),
  defaultExactMatch: z.boolean().default(false),
  // UI preferences
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  // Notification preferences
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  weeklyDigest: z.boolean().default(true),
  // Grading preferences
  defaultGradingMethod: z.enum(['auto', 'manual', 'ai', 'hybrid']).default('auto'),
  aiProvider: z.enum(['gemini', 'claude', 'openai']).default('gemini'),
  showConfidenceScores: z.boolean().default(true),
  requireReviewThreshold: z.number().min(0).max(1).default(0.7),
});

// Integration settings schema
export const IntegrationSettingsSchema = z.object({
  googleClassroomEnabled: z.boolean().default(true),
  googleFormsEnabled: z.boolean().default(true),
  lastClassroomSync: z.number().int().positive().optional(),
  lastFormsSync: z.number().int().positive().optional(),
  // API access tokens (encrypted)
  googleAccessToken: z.string().optional(),
  googleRefreshToken: z.string().optional(),
  tokenExpiresAt: z.number().int().positive().optional(),
  // Webhook settings
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  webhookEnabled: z.boolean().default(false),
});

// User configuration schema
export const UserConfigSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  preferences: UserPreferencesSchema,
  integrationSettings: IntegrationSettingsSchema,
  lastActiveTime: z.number().int().positive(),
  createdTime: z.number().int().positive(),
  updatedTime: z.number().int().positive(),
});

// Authentication schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(), // Optional for OAuth
  provider: z.enum(['google', 'email']).default('google'),
  redirectUrl: z.string().url().optional(),
});

export const AuthTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  tokenType: z.literal('Bearer').default('Bearer'),
  scope: z.string(),
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string().min(1),
  expiresAt: z.number().int().positive(),
  createdAt: z.number().int().positive(),
  lastAccessedAt: z.number().int().positive(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  isActive: z.boolean().default(true),
});

// User creation/update schemas
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: UserRoleSchema,
  avatar: z.string().url().optional(),
  googleId: z.string().optional(),
  domain: z.string().optional(),
  schoolId: z.string().optional(),
  department: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
  department: z.string().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
  integrationSettings: IntegrationSettingsSchema.partial().optional(),
});

// User query schemas
export const UserQuerySchema = z.object({
  role: UserRoleSchema.optional(),
  domain: z.string().optional(),
  schoolId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(), // Search by name or email
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastActiveAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Permission schemas
export const PermissionSchema = z.object({
  resource: z.enum([
    'classroom',
    'assignment',
    'submission',
    'grading',
    'analytics',
    'user_management',
    'system_config'
  ]),
  action: z.enum(['create', 'read', 'update', 'delete', 'execute']),
  scope: z.enum(['own', 'classroom', 'school', 'global']).default('own'),
});

export const RolePermissionsSchema = z.object({
  role: UserRoleSchema,
  permissions: z.array(PermissionSchema),
});

// Default role permissions
export const defaultRolePermissions: RolePermissionsSchema[] = [
  {
    role: 'teacher',
    permissions: [
      { resource: 'classroom', action: 'read', scope: 'own' },
      { resource: 'assignment', action: 'create', scope: 'classroom' },
      { resource: 'assignment', action: 'read', scope: 'classroom' },
      { resource: 'assignment', action: 'update', scope: 'classroom' },
      { resource: 'assignment', action: 'delete', scope: 'classroom' },
      { resource: 'submission', action: 'read', scope: 'classroom' },
      { resource: 'grading', action: 'execute', scope: 'classroom' },
      { resource: 'analytics', action: 'read', scope: 'classroom' },
    ],
  },
  {
    role: 'student',
    permissions: [
      { resource: 'classroom', action: 'read', scope: 'own' },
      { resource: 'assignment', action: 'read', scope: 'own' },
      { resource: 'submission', action: 'create', scope: 'own' },
      { resource: 'submission', action: 'read', scope: 'own' },
      { resource: 'submission', action: 'update', scope: 'own' },
    ],
  },
  {
    role: 'admin',
    permissions: [
      { resource: 'classroom', action: 'create', scope: 'school' },
      { resource: 'classroom', action: 'read', scope: 'school' },
      { resource: 'classroom', action: 'update', scope: 'school' },
      { resource: 'classroom', action: 'delete', scope: 'school' },
      { resource: 'assignment', action: 'read', scope: 'school' },
      { resource: 'submission', action: 'read', scope: 'school' },
      { resource: 'grading', action: 'execute', scope: 'school' },
      { resource: 'analytics', action: 'read', scope: 'school' },
      { resource: 'user_management', action: 'create', scope: 'school' },
      { resource: 'user_management', action: 'read', scope: 'school' },
      { resource: 'user_management', action: 'update', scope: 'school' },
      { resource: 'user_management', action: 'delete', scope: 'school' },
      { resource: 'system_config', action: 'read', scope: 'school' },
      { resource: 'system_config', action: 'update', scope: 'school' },
    ],
  },
];

// Type exports
export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type IntegrationSettings = z.infer<typeof IntegrationSettingsSchema>;
export type UserConfig = z.infer<typeof UserConfigSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type RolePermissions = z.infer<typeof RolePermissionsSchema>;

// Validation helpers
export function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}

export function validateUserConfig(data: unknown): UserConfig {
  return UserConfigSchema.parse(data);
}

export function validateCreateUser(data: unknown): CreateUser {
  return CreateUserSchema.parse(data);
}

export function validateAuthToken(data: unknown): AuthToken {
  return AuthTokenSchema.parse(data);
}

export function isValidUserRole(role: string): role is UserRole {
  return UserRoleSchema.safeParse(role).success;
}

// Permission checking helpers
export function hasPermission(
  userRole: UserRole,
  resource: Permission['resource'],
  action: Permission['action'],
  scope: Permission['scope'] = 'own'
): boolean {
  const rolePermissions = defaultRolePermissions.find(rp => rp.role === userRole);
  if (!rolePermissions) return false;

  return rolePermissions.permissions.some(
    p => p.resource === resource &&
         p.action === action &&
         (p.scope === scope || p.scope === 'global')
  );
}

export function getUserPermissions(userRole: UserRole): Permission[] {
  const rolePermissions = defaultRolePermissions.find(rp => rp.role === userRole);
  return rolePermissions?.permissions ?? [];
}

// User data transformation helpers
export function sanitizeUserForClient(user: User): Omit<User, 'googleId'> {
  const { googleId, ...sanitized } = user;
  return sanitized;
}

export function createDefaultUserConfig(userId: string): Omit<UserConfig, 'id'> {
  const now = Date.now();
  return {
    userId,
    preferences: UserPreferencesSchema.parse({}), // Use defaults
    integrationSettings: IntegrationSettingsSchema.parse({}), // Use defaults
    lastActiveTime: now,
    createdTime: now,
    updatedTime: now,
  };
}