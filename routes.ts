// Backend Routes - References: javascript_log_in_with_replit blueprint
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer, { type FileFilterCallback } from "multer";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";

// File upload configuration
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "video/mp4"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Helper function to calculate SLA deadline based on priority
function calculateSlaDeadline(priority: string): Date {
  const now = new Date();
  const hours = {
    critical: 24,
    high: 48,
    medium: 72,
    low: 120,
  }[priority] || 72;
  
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

// Helper function to auto-assign priority based on category
function getAutoPriority(category: string): "low" | "medium" | "high" | "critical" {
  const priorityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
    urgent: "critical",
    academic: "high",
    infrastructure: "medium",
    administrative: "low",
  };
  return priorityMap[category] || "medium";
}

// Generate tracking ID
function generateTrackingId(): string {
  return `GRV-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
}

// Auth-aware request (setupAuth attaches a user object)
type AuthRequest = Request & { user?: any };

export async function registerRoutes(app: Express): Promise<Server> {
  const storage = await createStorage();
  // Auth middleware - in development, allow a simple dev auth when REPLIT_DOMAINS is not configured
  let requireAuth: any;
  if (process.env.REPLIT_DOMAINS) {
    await setupAuth(app);
    requireAuth = isAuthenticated;
  } else {
    // Dev fallback: attach a fake user so protected routes work locally without OIDC
    requireAuth = (req: AuthRequest, _res: Response, next: any) => {
      req.user = {
        claims: { sub: process.env.DEV_USER_ID || 'dev-user' },
        access_token: 'dev-token',
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      };
      next();
    };
  }

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Public anonymous tracking route
  app.get('/api/grievances/track/:trackingId', async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      const grievance = await storage.getGrievanceByTrackingId(trackingId);
      
      if (!grievance) {
        return res.status(404).json({ message: "Grievance not found" });
      }
      
      res.json(grievance);
    } catch (error) {
      console.error("Error tracking grievance:", error);
      res.status(500).json({ message: "Failed to track grievance" });
    }
  });

  // Create grievance with file upload
  app.post('/api/grievances', requireAuth, upload.array('files', 5), async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, category, isAnonymous, isConfidential } = req.body;
      
      // Auto-assign priority based on category
  const priority = getAutoPriority(category) as "low" | "medium" | "high" | "critical";
      const slaDeadline = calculateSlaDeadline(priority);
      const trackingId = generateTrackingId();

      const grievance = await storage.createGrievance({
        userId: isAnonymous === "true" ? null : userId,
        trackingId,
        title,
        description,
        category,
        priority,
        isAnonymous: isAnonymous === "true",
        isConfidential: isConfidential === "true",
        slaDeadline,
        status: "submitted",
      });

      // Handle file uploads
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await storage.createFile({
            grievanceId: grievance.id!,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            uploadedBy: isAnonymous === "true" ? null : userId,
          });
        }
      }

      // Create notification for user (if not anonymous)
      if (!grievance.isAnonymous && grievance.userId) {
        await storage.createNotification({
          userId: grievance.userId,
          grievanceId: grievance.id!,
          title: "Grievance Submitted",
          message: `Your grievance "${title}" has been submitted successfully.`,
          isRead: false,
        });
      }

      res.json(grievance);
    } catch (error) {
      console.error("Error creating grievance:", error);
      res.status(500).json({ message: "Failed to create grievance" });
    }
  });

  // Get user's grievances
  app.get('/api/grievances/my', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const grievances = await storage.getUserGrievances(userId);
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching grievances:", error);
      res.status(500).json({ message: "Failed to fetch grievances" });
    }
  });

  // Get all grievances (for staff/admin)
  app.get('/api/grievances/all', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !["administrator", "staff", "faculty"].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const grievances = await storage.getAllGrievances();
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching grievances:", error);
      res.status(500).json({ message: "Failed to fetch grievances" });
    }
  });

  // Get single grievance
  app.get('/api/grievances/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const grievance = await storage.getGrievance(id);
      if (!grievance) {
        return res.status(404).json({ message: "Grievance not found" });
      }
      
      // Check access permissions
      const isOwner = grievance.userId === userId;
      const isStaff = user && ["administrator", "staff", "faculty"].includes(user.role);
      const canAccess = isOwner || (isStaff && (!grievance.isConfidential || user.role === "administrator"));
      
      if (!canAccess) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(grievance);
    } catch (error) {
      console.error("Error fetching grievance:", error);
      res.status(500).json({ message: "Failed to fetch grievance" });
    }
  });

  // Update grievance status
  app.patch('/api/grievances/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !["administrator", "staff", "faculty"].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const resolvedAt = (status === "resolved" || status === "closed") ? new Date() : undefined;
      const grievance = await storage.updateGrievanceStatus(id, status, resolvedAt);
      
      // Create notification for grievance owner
      if (grievance.userId) {
        await storage.createNotification({
          userId: grievance.userId,
          grievanceId: id,
          title: "Status Updated",
          message: `Your grievance status has been updated to ${status}.`,
          isRead: false,
        });
      }
      
      res.json(grievance);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Update grievance priority
  app.patch('/api/grievances/:id/priority', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { priority } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "administrator") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const slaDeadline = calculateSlaDeadline(priority);
      const grievance = await storage.updateGrievancePriority(id, priority, slaDeadline);
      
      // Create notification for grievance owner
      if (grievance.userId) {
        await storage.createNotification({
          userId: grievance.userId,
          grievanceId: id,
          title: "Priority Updated",
          message: `Your grievance priority has been updated to ${priority}.`,
          isRead: false,
        });
      }
      
      res.json(grievance);
    } catch (error) {
      console.error("Error updating priority:", error);
      res.status(500).json({ message: "Failed to update priority" });
    }
  });

  // Get grievance comments
  app.get('/api/grievances/:id/comments', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const comments = await storage.getGrievanceComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add comment to grievance
  app.post('/api/grievances/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.claims.sub;
      
      const comment = await storage.createComment({
        grievanceId: id,
        userId,
        content,
        isInternal: false,
      });
      
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Get grievance assignments
  app.get('/api/grievances/:id/assignments', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const assignments = await storage.getGrievanceAssignments(id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const stats = await storage.getDashboardStats(userId, user?.role);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Analytics (admin only)
  app.get('/api/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "administrator") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get user notifications
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get all users (admin only)
  app.get('/api/users', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "administrator") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.patch('/api/users/:id/role', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "administrator") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
