import type {
  User,
  UpsertUser,
  Grievance,
  InsertGrievance,
  Assignment,
  InsertAssignment,
  Comment,
  InsertComment,
  File,
  InsertFile,
  Notification,
  InsertNotification,
} from "@shared/schema";

import { v4 as uuidv4 } from "uuid";

export class InMemoryStorage {
  users: Record<string, any> = {};
  grievances: Record<string, any> = {};
  comments: Record<string, any> = {};
  assignments: Record<string, any> = {};
  files: Record<string, any> = {};
  notifications: Record<string, any> = {};

  // User
  async getUser(id: string): Promise<User | undefined> {
    return this.users[id];
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const id = (user as any).id;
    const now = new Date();
    const u = {
      id,
      email: (user as any).email || null,
      firstName: (user as any).firstName || null,
      lastName: (user as any).lastName || null,
      profileImageUrl: (user as any).profileImageUrl || null,
      role: (user as any).role || "student",
      createdAt: now,
      updatedAt: now,
    } as any;
    this.users[id] = u;
    return u;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const user = this.users[id];
    user.role = role;
    user.updatedAt = new Date();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Object.values(this.users);
  }

  // Grievance
  async createGrievance(grievanceData: InsertGrievance & { trackingId: string }): Promise<Grievance> {
    const id = uuidv4();
    const g = { id, ...grievanceData, createdAt: new Date(), updatedAt: new Date() } as any;
    this.grievances[id] = g;
    return g;
  }

  async getGrievance(id: string): Promise<Grievance | undefined> {
    return this.grievances[id];
  }

  async getGrievanceByTrackingId(trackingId: string): Promise<Grievance | undefined> {
    return Object.values(this.grievances).find((g: any) => g.trackingId === trackingId) as any;
  }

  async getUserGrievances(userId: string): Promise<Grievance[]> {
    return Object.values(this.grievances).filter((g: any) => g.userId === userId);
  }

  async getAllGrievances(): Promise<Grievance[]> {
    return Object.values(this.grievances);
  }

  async updateGrievanceStatus(id: string, status: string, resolvedAt?: Date): Promise<Grievance> {
    const g = this.grievances[id];
    g.status = status;
    if (resolvedAt) g.resolvedAt = resolvedAt;
    g.updatedAt = new Date();
    return g;
  }

  async updateGrievancePriority(id: string, priority: string, slaDeadline: Date): Promise<Grievance> {
    const g = this.grievances[id];
    g.priority = priority;
    g.slaDeadline = slaDeadline;
    g.updatedAt = new Date();
    return g;
  }

  // Assignment
  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const id = uuidv4();
    const a = { id, ...assignmentData, createdAt: new Date() } as any;
    this.assignments[id] = a;
    return a;
  }

  async getGrievanceAssignments(grievanceId: string): Promise<Assignment[]> {
    return Object.values(this.assignments).filter((a: any) => a.grievanceId === grievanceId);
  }

  // Comments
  async createComment(commentData: InsertComment): Promise<Comment> {
    const id = uuidv4();
    const c = { id, ...commentData, createdAt: new Date() } as any;
    this.comments[id] = c;
    return c;
  }

  async getGrievanceComments(grievanceId: string): Promise<Comment[]> {
    return Object.values(this.comments).filter((c: any) => c.grievanceId === grievanceId);
  }

  // Files
  async createFile(fileData: InsertFile): Promise<File> {
    const id = uuidv4();
    const f = { id, ...fileData, createdAt: new Date() } as any;
    this.files[id] = f;
    return f;
  }

  async getGrievanceFiles(grievanceId: string): Promise<File[]> {
    return Object.values(this.files).filter((f: any) => f.grievanceId === grievanceId);
  }

  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = uuidv4();
    const n = { id, ...notificationData, createdAt: new Date() } as any;
    this.notifications[id] = n;
    return n;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return Object.values(this.notifications).filter((n: any) => n.userId === userId);
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const n = this.notifications[id];
    n.isRead = true;
    return n;
  }

  // Analytics - simple implementations
  async getDashboardStats(userId?: string, role?: string): Promise<any> {
    const allGrievances = Object.values(this.grievances) as any[];
    const now = new Date();
    const pending = allGrievances.filter(g => !["resolved", "closed"].includes(g.status)).length;
    const resolved = allGrievances.filter(g => ["resolved", "closed"].includes(g.status)).length;
    const overdue = allGrievances.filter(g => g.slaDeadline && new Date(g.slaDeadline) < now && !["resolved", "closed"].includes(g.status)).length;
    return { total: allGrievances.length, pending, resolved, overdue };
  }

  async getAnalytics(): Promise<any> {
    const allGrievances = Object.values(this.grievances) as any[];
    return { totalGrievances: allGrievances.length };
  }
}

export const memoryStorage = new InMemoryStorage();
