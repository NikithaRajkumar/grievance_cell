// Database schema for College Grievance Cell Management System
// References: Replit Auth blueprint (javascript_log_in_with_replit)
// References: PostgreSQL database blueprint (javascript_database)

import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum("user_role", ["student", "faculty", "staff", "administrator"]);
export const grievanceCategoryEnum = pgEnum("grievance_category", ["academic", "infrastructure", "administrative", "urgent"]);
export const grievancePriorityEnum = pgEnum("grievance_priority", ["low", "medium", "high", "critical"]);
export const grievanceStatusEnum = pgEnum("grievance_status", ["submitted", "under_review", "assigned", "in_progress", "resolved", "closed"]);

// User storage table - Required for Replit Auth with role management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("student"),
  department: varchar("department"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  grievances: many(grievances),
  assignments: many(assignments),
  comments: many(comments),
}));

// Grievances table
export const grievances = pgTable("grievances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingId: varchar("tracking_id").notNull().unique(), // System-generated ID for anonymous tracking
  userId: varchar("user_id").references(() => users.id), // NULL for anonymous submissions
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: grievanceCategoryEnum("category").notNull(),
  priority: grievancePriorityEnum("priority").notNull().default("medium"),
  status: grievanceStatusEnum("status").notNull().default("submitted"),
  isConfidential: boolean("is_confidential").notNull().default(false),
  slaDeadline: timestamp("sla_deadline"), // Calculated based on priority
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const grievancesRelations = relations(grievances, ({ one, many }) => ({
  user: one(users, {
    fields: [grievances.userId],
    references: [users.id],
  }),
  assignments: many(assignments),
  comments: many(comments),
  files: many(files),
  notifications: many(notifications),
}));

// Assignments table - tracks who is assigned to grievances
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").notNull().references(() => grievances.id, { onDelete: 'cascade' }),
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  department: varchar("department"),
  deadline: timestamp("deadline"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  grievance: one(grievances, {
    fields: [assignments.grievanceId],
    references: [grievances.id],
  }),
  assignee: one(users, {
    fields: [assignments.assignedTo],
    references: [users.id],
  }),
  assigner: one(users, {
    fields: [assignments.assignedBy],
    references: [users.id],
  }),
}));

// Comments/Timeline table - tracks all actions and communications
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").notNull().references(() => grievances.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // Internal admin notes
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  grievance: one(grievances, {
    fields: [comments.grievanceId],
    references: [grievances.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Files table - uploaded documents and evidence
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").notNull().references(() => grievances.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  filePath: varchar("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id), // NULL for anonymous uploads
  createdAt: timestamp("created_at").defaultNow(),
});

export const filesRelations = relations(files, ({ one }) => ({
  grievance: one(grievances, {
    fields: [files.grievanceId],
    references: [grievances.id],
  }),
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
}));

// Notifications table - in-app notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  grievanceId: varchar("grievance_id").references(() => grievances.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  grievance: one(grievances, {
    fields: [notifications.grievanceId],
    references: [grievances.id],
  }),
}));

// Types and schemas
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Grievance = typeof grievances.$inferSelect;
export const insertGrievanceSchema = createInsertSchema(grievances).omit({
  id: true,
  trackingId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});
export type InsertGrievance = z.infer<typeof insertGrievanceSchema>;

export type Assignment = typeof assignments.$inferSelect;
export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Comment = typeof comments.$inferSelect;
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type File = typeof files.$inferSelect;
export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
