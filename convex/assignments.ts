import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

// Create a new assignment
export const createAssignment = mutation({
  args: {
    userId: v.string(),
    courseId: v.string(),
    courseWorkId: v.string(),
    formId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    state: v.optional(v.string()),
    alternateLink: v.optional(v.string()),
    creationTime: v.optional(v.string()),
    updateTime: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    maxPoints: v.optional(v.number()),
    workType: v.optional(v.string()),
    submissionModificationMode: v.optional(v.string()),
    assigneeMode: v.optional(v.string()),
    creatorUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assignmentId = await ctx.db.insert("assignments", {
      ...args,
      state: args.state || "PUBLISHED",
      workType: args.workType || "ASSIGNMENT",
      lastSyncTime: Date.now(),
    });

    return assignmentId;
  },
});

// Get assignment by ID
export const getAssignment = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assignmentId);
  },
});

// Update assignment
export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      maxPoints: v.optional(v.number()),
      state: v.optional(v.string()),
      lastSyncTime: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, {
      ...args.updates,
      lastSyncTime: Date.now(),
    });

    return args.assignmentId;
  },
});

// Delete assignment
export const deleteAssignment = mutation({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.assignmentId);
    return { success: true };
  },
});

// Get assignments for a course
export const getAssignmentsByCourse = query({
  args: { courseId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

// Get assignments for a user
export const getAssignmentsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});