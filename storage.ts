// Database Storage Implementation - References: javascript_log_in_with_replit & javascript_database blueprints
import {
  users,
  grievances,
  assignments,
  comments,
  files,
  notifications,
  type User,
  type UpsertUser,
  type Grievance,
  type InsertGrievance,
  type Assignment,
  type InsertAssignment,
  type Comment,
  type InsertComment,
  type File,
  type InsertFile,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
// Import DB client at runtime only when DATABASE_URL is set to avoid hard failure
let dbClient: any = undefined;
if (process.env.DATABASE_URL) {
  const mod = await import("./db");
  dbClient = mod.db;
}
import { eq, and, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Grievance operations
  createGrievance(grievance: InsertGrievance & { trackingId: string }): Promise<Grievance>;
  getGrievance(id: string): Promise<Grievance | undefined>;
  getGrievanceByTrackingId(trackingId: string): Promise<Grievance | undefined>;
  getUserGrievances(userId: string): Promise<Grievance[]>;
  getAllGrievances(): Promise<Grievance[]>;
  updateGrievanceStatus(id: string, status: string, resolvedAt?: Date): Promise<Grievance>;
  updateGrievancePriority(id: string, priority: string, slaDeadline: Date): Promise<Grievance>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getGrievanceAssignments(grievanceId: string): Promise<Assignment[]>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getGrievanceComments(grievanceId: string): Promise<Comment[]>;

  // File operations
  createFile(file: InsertFile): Promise<File>;
  getGrievanceFiles(grievanceId: string): Promise<File[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification>;

  // Analytics
  getDashboardStats(userId?: string, role?: string): Promise<any>;
  getAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations - Required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
  const [user] = await dbClient.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await dbClient
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await dbClient
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await dbClient
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  // Grievance operations
  async createGrievance(grievanceData: InsertGrievance & { trackingId: string }): Promise<Grievance> {
    const [grievance] = await dbClient
      .insert(grievances)
      .values(grievanceData)
      .returning();
    return grievance;
  }

  async getGrievance(id: string): Promise<Grievance | undefined> {
    const [grievance] = await dbClient
      .select()
      .from(grievances)
      .where(eq(grievances.id, id));
    return grievance;
  }

  async getGrievanceByTrackingId(trackingId: string): Promise<Grievance | undefined> {
    const [grievance] = await dbClient
      .select()
      .from(grievances)
      .where(eq(grievances.trackingId, trackingId));
    return grievance;
  }

  async getUserGrievances(userId: string): Promise<Grievance[]> {
    return await dbClient
      .select()
      .from(grievances)
      .where(eq(grievances.userId, userId))
      .orderBy(desc(grievances.createdAt));
  }

  async getAllGrievances(): Promise<Grievance[]> {
    return await dbClient
      .select()
      .from(grievances)
      .orderBy(desc(grievances.createdAt));
  }

  async updateGrievanceStatus(id: string, status: string, resolvedAt?: Date): Promise<Grievance> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (resolvedAt) {
      updateData.resolvedAt = resolvedAt;
    }
    
    const [grievance] = await dbClient
      .update(grievances)
      .set(updateData)
      .where(eq(grievances.id, id))
      .returning();
    return grievance;
  }

  async updateGrievancePriority(id: string, priority: string, slaDeadline: Date): Promise<Grievance> {
    const [grievance] = await dbClient
      .update(grievances)
      .set({ 
        priority: priority as any, 
        slaDeadline,
        updatedAt: new Date() 
      })
      .where(eq(grievances.id, id))
      .returning();
    return grievance;
  }

  // Assignment operations
  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const [assignment] = await dbClient
      .insert(assignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }

  async getGrievanceAssignments(grievanceId: string): Promise<Assignment[]> {
    return await dbClient
      .select()
      .from(assignments)
      .where(eq(assignments.grievanceId, grievanceId))
      .orderBy(desc(assignments.createdAt));
  }

  // Comment operations
  async createComment(commentData: InsertComment): Promise<Comment> {
    const [comment] = await dbClient
      .insert(comments)
      .values(commentData)
      .returning();
    return comment;
  }

  async getGrievanceComments(grievanceId: string): Promise<Comment[]> {
    return await dbClient
      .select()
      .from(comments)
      .where(eq(comments.grievanceId, grievanceId))
      .orderBy(desc(comments.createdAt));
  }

  // File operations
  async createFile(fileData: InsertFile): Promise<File> {
    const [file] = await dbClient
      .insert(files)
      .values(fileData)
      .returning();
    return file;
  }

  async getGrievanceFiles(grievanceId: string): Promise<File[]> {
    return await dbClient
      .select()
      .from(files)
      .where(eq(files.grievanceId, grievanceId))
      .orderBy(desc(files.createdAt));
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await dbClient
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await dbClient
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const [notification] = await dbClient
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  // Analytics
  async getDashboardStats(userId?: string, role?: string): Promise<any> {
  let query = dbClient.select().from(grievances);
    
    // Filter by user if not admin/staff
    if (userId && role === "student") {
      query = query.where(eq(grievances.userId, userId)) as any;
    }

    const allGrievances = await query;
    
    const now = new Date();
    const pending = allGrievances.filter(g => 
      !["resolved", "closed"].includes(g.status)
    ).length;
    
    const resolved = allGrievances.filter(g => 
      g.status === "resolved" || g.status === "closed"
    ).length;
    
    const overdue = allGrievances.filter(g => 
      g.slaDeadline && 
      new Date(g.slaDeadline) < now && 
      !["resolved", "closed"].includes(g.status)
    ).length;

    return {
      total: allGrievances.length,
      pending,
      resolved,
      overdue,
    };
  }

  async getAnalytics(): Promise<any> {
  const allGrievances = await dbClient.select().from(grievances);
    
    // Category breakdown
    const categoryBreakdown = allGrievances.reduce((acc: any[], g) => {
      const existing = acc.find(item => item.category === g.category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ category: g.category, count: 1 });
      }
      return acc;
    }, []);

    // Priority distribution
    const priorityDistribution = allGrievances.reduce((acc: any[], g) => {
      const existing = acc.find(item => item.priority === g.priority);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ priority: g.priority, count: 1 });
      }
      return acc;
    }, []);

    // Status distribution
    const statusDistribution = allGrievances.reduce((acc: any[], g) => {
      const existing = acc.find(item => item.status === g.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: g.status, count: 1 });
      }
      return acc;
    }, []);

    // Calculate average resolution time
    const resolvedGrievances = allGrievances.filter(g => g.resolvedAt);
    const avgResolutionTime = resolvedGrievances.length > 0
      ? Math.round(
          resolvedGrievances.reduce((sum, g) => {
            const created = new Date(g.createdAt!).getTime();
            const resolved = new Date(g.resolvedAt!).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60); // hours
          }, 0) / resolvedGrievances.length
        )
      : 0;

    // SLA compliance
    const grievancesWithSLA = allGrievances.filter(g => g.slaDeadline && g.resolvedAt);
    const slaCompliant = grievancesWithSLA.filter(g => 
      new Date(g.resolvedAt!) <= new Date(g.slaDeadline!)
    ).length;
    const slaCompliance = grievancesWithSLA.length > 0
      ? Math.round((slaCompliant / grievancesWithSLA.length) * 100)
      : 0;

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'short' });
      
      const submitted = allGrievances.filter(g => {
        const gDate = new Date(g.createdAt!);
        return gDate.getMonth() === date.getMonth() && 
               gDate.getFullYear() === date.getFullYear();
      }).length;
      
      const resolved = allGrievances.filter(g => {
        if (!g.resolvedAt) return false;
        const gDate = new Date(g.resolvedAt);
        return gDate.getMonth() === date.getMonth() && 
               gDate.getFullYear() === date.getFullYear();
      }).length;
      
      monthlyTrends.push({ month, submitted, resolved });
    }

    return {
      totalGrievances: allGrievances.length,
      avgResolutionTime,
      slaCompliance,
      categoryBreakdown,
      priorityDistribution,
      statusDistribution,
      monthlyTrends,
    };
  }
}

// Storage implementation will be created on demand by createStorage()
let storageImpl: IStorage | undefined = undefined;

export async function createStorage(): Promise<IStorage> {
  if (storageImpl) return storageImpl;

  if (!process.env.DATABASE_URL) {
    const mod = await import("./storage-memory");
    storageImpl = mod.memoryStorage;
    return storageImpl;
  }

  // Database URL present: use DatabaseStorage
  storageImpl = new DatabaseStorage();
  return storageImpl;
}
