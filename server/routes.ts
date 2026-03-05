import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireRole, signToken } from "./auth";
import { sendTicketEmail } from "./emailService";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      const { passwordHash: _, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const filters = {
        direction: req.query.direction as any,
        statusKey: req.query.statusKey as string,
        status: req.query.status as string,
        ownerName: req.query.ownerName as string,
        assignedToName: req.query.assignedToName as string,
        serviceOrder: req.query.serviceOrder as string,
        state: req.query.state as string,
        projectName: req.query.projectName as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 25,
      };
      const result = await storage.listTickets(filters);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicketWithRelations(id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.json(ticket);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const ticketData = {
        ...req.body,
        createdByUserId: user.id,
        ownerName: user.firstName + " " + user.lastName,
        ownerEmail: user.email,
      };

      const ticket = await storage.createTicket(ticketData);
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tickets/create-full", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { ticket: ticketData, items: itemsData, direction } = req.body;

      if (!ticketData.state) {
        return res.status(400).json({ message: "State is required" });
      }
      if (!ticketData.projectName) {
        return res.status(400).json({ message: "Project name is required" });
      }
      if (!itemsData || !Array.isArray(itemsData) || !itemsData.some((i: any) => i.itemCode)) {
        return res.status(400).json({ message: "At least one item with an item code is required" });
      }

      const newTicket = await storage.createTicket({
        direction,
        status: ticketData.status || "New",
        statusKey: ticketData.statusKey || "NEW",
        createdByUserId: user.id,
        ownerName: user.firstName + " " + user.lastName,
        ownerEmail: user.email,
      });

      const result = await storage.saveTicketWithItems(
        { ...ticketData, id: newTicket.id },
        itemsData
      );
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tickets/:id/save", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { ticket: ticketData, items: itemsData } = req.body;

      if (!ticketData.state) {
        return res.status(400).json({ message: "State is required" });
      }
      if (!ticketData.projectName) {
        return res.status(400).json({ message: "Project name is required" });
      }
      if (!itemsData || !Array.isArray(itemsData) || !itemsData.some((i: any) => i.itemCode)) {
        return res.status(400).json({ message: "At least one item with an item code is required" });
      }

      const existing = await storage.getTicket(id);
      if (!existing) return res.status(404).json({ message: "Ticket not found" });

      const user = req.user!;
      if (user.role === "USER" && existing.createdByUserId !== user.userId) {
        return res.status(403).json({ message: "You can only edit your own tickets" });
      }

      const result = await storage.saveTicketWithItems(
        { ...ticketData, id },
        itemsData
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { messageText } = req.body;
      if (!messageText?.trim()) {
        return res.status(400).json({ message: "Message text is required" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      const sender = await storage.getUser(req.user!.userId);
      if (!sender) return res.status(401).json({ message: "User not found" });

      const message = await storage.createMessage({
        ticketId,
        senderUserId: sender.id,
        messageText: messageText.trim(),
      });

      const senderName = `${sender.firstName} ${sender.lastName}`;
      let recipientEmail: string | null = null;

      if (sender.id === ticket.createdByUserId) {
        recipientEmail = ticket.assignedToEmail || process.env.COORDINATOR_GROUP_EMAIL || null;
      } else {
        recipientEmail = ticket.ownerEmail || null;
      }

      if (recipientEmail) {
        await sendTicketEmail({
          ticketId,
          messageId: message.id,
          toEmail: recipientEmail,
          subject: `New message on Ticket #${ticketId}`,
          body: `${senderName} wrote:\n\n${messageText}\n\nView the ticket in Materials OS.`,
        });
      }

      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/users", requireAuth, requireRole("ADMIN"), async (_req, res) => {
    try {
      const usersList = await storage.listUsers();
      const safe = usersList.map(({ passwordHash: _, ...u }) => u);
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const { email, firstName, lastName, role, password, subcontractorId } = req.body;
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, firstName, lastName are required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "User already exists" });

      const passwordHash = password ? await bcrypt.hash(password, 10) : null;
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        role: role || "USER",
        subcontractorId: subcontractorId || null,
        passwordHash,
        isActive: true,
      });
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data: any = { ...req.body };

      if (data.password) {
        data.passwordHash = await bcrypt.hash(data.password, 10);
        delete data.password;
      }

      const updated = await storage.updateUser(id, data);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/statuses", requireAuth, async (_req, res) => {
    try { res.json(await storage.listTicketStatuses()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/admin/statuses", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { res.status(201).json(await storage.createTicketStatus(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/admin/statuses/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const updated = await storage.updateTicketStatus(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/admin/statuses/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { await storage.deleteTicketStatus(parseInt(req.params.id)); res.json({ message: "Deleted" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/admin/departments", requireAuth, async (_req, res) => {
    try { res.json(await storage.listDepartments()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/admin/departments", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { res.status(201).json(await storage.createDepartment(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/admin/departments/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const updated = await storage.updateDepartment(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/admin/departments/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { await storage.deleteDepartment(parseInt(req.params.id)); res.json({ message: "Deleted" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/admin/department-techs", requireAuth, async (_req, res) => {
    try { res.json(await storage.listDepartmentTechs()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/admin/department-techs", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { res.status(201).json(await storage.createDepartmentTech(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/admin/department-techs/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const updated = await storage.updateDepartmentTech(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/admin/department-techs/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { await storage.deleteDepartmentTech(parseInt(req.params.id)); res.json({ message: "Deleted" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/admin/subcontractors", requireAuth, async (_req, res) => {
    try { res.json(await storage.listSubcontractors()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/admin/subcontractors", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { res.status(201).json(await storage.createSubcontractor(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/admin/subcontractors/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const updated = await storage.updateSubcontractor(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/admin/subcontractors/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { await storage.deleteSubcontractor(parseInt(req.params.id)); res.json({ message: "Deleted" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/admin/roles", requireAuth, async (_req, res) => {
    try { res.json(await storage.listAppRoles()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/admin/roles", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { res.status(201).json(await storage.createAppRole(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/admin/roles/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const updated = await storage.updateAppRole(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/admin/roles/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try { await storage.deleteAppRole(parseInt(req.params.id)); res.json({ message: "Deleted" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/users/coordinators", requireAuth, async (_req, res) => {
    try {
      const allUsers = await storage.listUsers();
      const coordinators = allUsers.filter(u => u.role === "COORDINATOR" || u.role === "ADMIN");
      res.json(coordinators.map(({ passwordHash: _, ...u }) => u));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  return httpServer;
}
