import { db } from "./db";
import {
  users, tickets, ticketItems, ticketMessages,
  subcontractors, departments, departmentTechs, ticketStatuses,
  appSettings, emailLogs,
  type InsertUser, type User,
  type InsertTicket, type Ticket,
  type InsertTicketItem, type TicketItem,
  type InsertTicketMessage, type TicketMessage,
  type InsertSubcontractor, type Subcontractor,
  type InsertDepartment, type Department,
  type InsertDepartmentTech, type DepartmentTech,
  type InsertTicketStatus, type TicketStatus,
} from "@shared/schema";
import { eq, and, or, ilike, sql, desc, asc, count } from "drizzle-orm";

export interface TicketFilters {
  direction?: "INBOUND" | "OUTBOUND";
  statusKey?: string;
  status?: string;
  ownerName?: string;
  assignedToName?: string;
  serviceOrder?: string;
  state?: string;
  projectName?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;

  listTickets(filters: TicketFilters): Promise<{ tickets: Ticket[]; total: number }>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketWithRelations(id: number): Promise<any>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, data: Partial<InsertTicket>): Promise<Ticket | undefined>;

  getTicketItems(ticketId: number): Promise<TicketItem[]>;
  upsertTicketItems(ticketId: number, items: InsertTicketItem[]): Promise<TicketItem[]>;
  deleteTicketItem(id: number): Promise<void>;

  createMessage(msg: InsertTicketMessage): Promise<TicketMessage>;
  getTicketMessages(ticketId: number): Promise<any[]>;

  listSubcontractors(): Promise<Subcontractor[]>;
  createSubcontractor(s: InsertSubcontractor): Promise<Subcontractor>;
  updateSubcontractor(id: number, data: Partial<InsertSubcontractor>): Promise<Subcontractor | undefined>;
  deleteSubcontractor(id: number): Promise<void>;

  listDepartments(): Promise<Department[]>;
  createDepartment(d: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<void>;

  listDepartmentTechs(): Promise<DepartmentTech[]>;
  createDepartmentTech(t: InsertDepartmentTech): Promise<DepartmentTech>;
  updateDepartmentTech(id: number, data: Partial<InsertDepartmentTech>): Promise<DepartmentTech | undefined>;
  deleteDepartmentTech(id: number): Promise<void>;

  listTicketStatuses(): Promise<TicketStatus[]>;
  createTicketStatus(s: InsertTicketStatus): Promise<TicketStatus>;
  updateTicketStatus(id: number, data: Partial<InsertTicketStatus>): Promise<TicketStatus | undefined>;
  deleteTicketStatus(id: number): Promise<void>;

  saveTicketWithItems(ticketData: Partial<InsertTicket> & { id?: number }, itemsData: (InsertTicketItem & { id?: number })[]): Promise<{ ticket: Ticket; items: TicketItem[] }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({ ...user, email: user.email.toLowerCase() }).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  async listUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.firstName));
  }

  async listTickets(filters: TicketFilters): Promise<{ tickets: Ticket[]; total: number }> {
    const conditions: any[] = [];

    if (filters.direction) {
      conditions.push(eq(tickets.direction, filters.direction));
    }
    if (filters.statusKey && filters.statusKey !== "All") {
      conditions.push(eq(tickets.statusKey, filters.statusKey as any));
    }
    if (filters.status && filters.status !== "All") {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters.ownerName && filters.ownerName !== "All") {
      conditions.push(eq(tickets.ownerName, filters.ownerName));
    }
    if (filters.assignedToName && filters.assignedToName !== "All") {
      conditions.push(eq(tickets.assignedToName, filters.assignedToName));
    }
    if (filters.serviceOrder && filters.serviceOrder !== "All") {
      conditions.push(eq(tickets.serviceOrder, filters.serviceOrder));
    }
    if (filters.state && filters.state !== "All") {
      conditions.push(eq(tickets.state, filters.state));
    }
    if (filters.projectName && filters.projectName !== "All") {
      conditions.push(eq(tickets.projectName, filters.projectName));
    }

    if (filters.search) {
      const s = `%${filters.search}%`;
      const searchConds: any[] = [
        ilike(tickets.serviceOrder, s),
        ilike(tickets.ownerName, s),
        ilike(tickets.assignedToName, s),
        ilike(tickets.state, s),
        ilike(tickets.projectName, s),
      ];
      const numVal = parseInt(filters.search, 10);
      if (!isNaN(numVal)) {
        searchConds.push(eq(tickets.id, numVal));
      }
      conditions.push(or(...searchConds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;

    const [{ total: totalCount }] = await db.select({ total: count() }).from(tickets).where(whereClause);
    const rows = await db.select().from(tickets).where(whereClause).orderBy(desc(tickets.id)).limit(pageSize).offset((page - 1) * pageSize);

    return { tickets: rows, total: Number(totalCount) };
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async getTicketWithRelations(id: number): Promise<any> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;

    const items = await this.getTicketItems(id);
    const messages = await this.getTicketMessages(id);

    return { ...ticket, items, messages };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  }

  async updateTicket(id: number, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const [updated] = await db.update(tickets).set({ ...data, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    return updated;
  }

  async getTicketItems(ticketId: number): Promise<TicketItem[]> {
    return db.select().from(ticketItems).where(eq(ticketItems.ticketId, ticketId)).orderBy(asc(ticketItems.id));
  }

  async upsertTicketItems(ticketId: number, items: InsertTicketItem[]): Promise<TicketItem[]> {
    const result: TicketItem[] = [];
    for (const item of items) {
      const [row] = await db.insert(ticketItems).values({ ...item, ticketId }).returning();
      result.push(row);
    }
    return result;
  }

  async deleteTicketItem(id: number): Promise<void> {
    await db.delete(ticketItems).where(eq(ticketItems.id, id));
  }

  async createMessage(msg: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(msg).returning();
    return created;
  }

  async getTicketMessages(ticketId: number): Promise<any[]> {
    const rows = await db
      .select({
        id: ticketMessages.id,
        ticketId: ticketMessages.ticketId,
        senderUserId: ticketMessages.senderUserId,
        messageText: ticketMessages.messageText,
        createdAt: ticketMessages.createdAt,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderEmail: users.email,
      })
      .from(ticketMessages)
      .leftJoin(users, eq(ticketMessages.senderUserId, users.id))
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt));
    return rows;
  }

  async listSubcontractors(): Promise<Subcontractor[]> {
    return db.select().from(subcontractors).orderBy(asc(subcontractors.name));
  }

  async createSubcontractor(s: InsertSubcontractor): Promise<Subcontractor> {
    const [created] = await db.insert(subcontractors).values(s).returning();
    return created;
  }

  async updateSubcontractor(id: number, data: Partial<InsertSubcontractor>): Promise<Subcontractor | undefined> {
    const [updated] = await db.update(subcontractors).set({ ...data, updatedAt: new Date() }).where(eq(subcontractors.id, id)).returning();
    return updated;
  }

  async deleteSubcontractor(id: number): Promise<void> {
    await db.delete(subcontractors).where(eq(subcontractors.id, id));
  }

  async listDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(asc(departments.sortOrder), asc(departments.title));
  }

  async createDepartment(d: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(d).returning();
    return created;
  }

  async updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db.update(departments).set({ ...data, updatedAt: new Date() }).where(eq(departments.id, id)).returning();
    return updated;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  async listDepartmentTechs(): Promise<DepartmentTech[]> {
    return db.select().from(departmentTechs).orderBy(asc(departmentTechs.name));
  }

  async createDepartmentTech(t: InsertDepartmentTech): Promise<DepartmentTech> {
    const [created] = await db.insert(departmentTechs).values(t).returning();
    return created;
  }

  async updateDepartmentTech(id: number, data: Partial<InsertDepartmentTech>): Promise<DepartmentTech | undefined> {
    const [updated] = await db.update(departmentTechs).set({ ...data, updatedAt: new Date() }).where(eq(departmentTechs.id, id)).returning();
    return updated;
  }

  async deleteDepartmentTech(id: number): Promise<void> {
    await db.delete(departmentTechs).where(eq(departmentTechs.id, id));
  }

  async listTicketStatuses(): Promise<TicketStatus[]> {
    return db.select().from(ticketStatuses).orderBy(asc(ticketStatuses.sortOrder), asc(ticketStatuses.title));
  }

  async createTicketStatus(s: InsertTicketStatus): Promise<TicketStatus> {
    const [created] = await db.insert(ticketStatuses).values(s).returning();
    return created;
  }

  async updateTicketStatus(id: number, data: Partial<InsertTicketStatus>): Promise<TicketStatus | undefined> {
    const [updated] = await db.update(ticketStatuses).set({ ...data, updatedAt: new Date() }).where(eq(ticketStatuses.id, id)).returning();
    return updated;
  }

  async deleteTicketStatus(id: number): Promise<void> {
    await db.delete(ticketStatuses).where(eq(ticketStatuses.id, id));
  }

  async saveTicketWithItems(
    ticketData: Partial<InsertTicket> & { id?: number },
    itemsData: (InsertTicketItem & { id?: number })[]
  ): Promise<{ ticket: Ticket; items: TicketItem[] }> {
    return await db.transaction(async (tx) => {
      let ticket: Ticket;

      if (ticketData.id) {
        const { id, ...updateData } = ticketData;
        const [updated] = await tx.update(tickets)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(tickets.id, id))
          .returning();
        ticket = updated;
      } else {
        const [created] = await tx.insert(tickets).values(ticketData as InsertTicket).returning();
        ticket = created;
      }

      await tx.delete(ticketItems).where(eq(ticketItems.ticketId, ticket.id));

      const savedItems: TicketItem[] = [];
      for (const item of itemsData) {
        const { id: _id, ...itemValues } = item;
        const [row] = await tx.insert(ticketItems).values({
          ...itemValues,
          ticketId: ticket.id,
          direction: ticket.direction,
        }).returning();
        savedItems.push(row);
      }

      return { ticket, items: savedItems };
    });
  }
}

export const storage = new DatabaseStorage();
