import { db } from "./db";
import {
  users, tickets, ticketItems, ticketMessages,
  subcontractors, departments, departmentTechs, ticketStatuses,
  appSettings, emailLogs, appRoles, warehouses,
  type InsertUser, type User,
  type InsertTicket, type Ticket,
  type InsertTicketItem, type TicketItem,
  type InsertTicketMessage, type TicketMessage,
  type InsertSubcontractor, type Subcontractor,
  type InsertDepartment, type Department,
  type InsertDepartmentTech, type DepartmentTech,
  type InsertTicketStatus, type TicketStatus,
  type InsertAppRole, type AppRole,
  type InsertWarehouse, type Warehouse,
} from "@shared/schema";
import { eq, and, or, ilike, sql, desc, asc, count, getTableColumns } from "drizzle-orm";

export interface TicketFilters {
  direction?: "INBOUND" | "OUTBOUND";
  statusKey?: string;
  status?: string;
  ownerName?: string;
  assignedToName?: string;
  subcontractorId?: number;
  serviceOrder?: string;
  state?: string;
  projectName?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  columnFilters?: Record<string, string>;
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

  getTicketItems(ticketId: number, direction?: string): Promise<TicketItem[]>;
  upsertTicketItems(ticketId: number, items: InsertTicketItem[]): Promise<TicketItem[]>;
  deleteTicketItem(id: number): Promise<void>;

  createMessage(msg: InsertTicketMessage): Promise<TicketMessage>;
  getTicketMessages(ticketId: number): Promise<any[]>;

  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(w: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number): Promise<void>;

  listSubcontractors(): Promise<Subcontractor[]>;
  getSubcontractor(id: number): Promise<Subcontractor | undefined>;
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

  listAppRoles(): Promise<AppRole[]>;
  createAppRole(r: InsertAppRole): Promise<AppRole>;
  updateAppRole(id: number, data: Partial<InsertAppRole>): Promise<AppRole | undefined>;
  deleteAppRole(id: number): Promise<void>;

  saveTicketWithItems(ticketData: Partial<InsertTicket> & { id?: number }, itemsData: (InsertTicketItem & { id?: number })[]): Promise<{ ticket: Ticket; items: TicketItem[] }>;
  getDashboardStats(direction?: string, status?: string): Promise<{ byProject: { name: string; count: number }[]; byMonth: { month: string; count: number; items: number }[] }>;
  getDistinctColumnValues(direction: string, column: string, search?: string, subcontractorId?: number): Promise<string[]>;
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
    if (filters.subcontractorId) {
      conditions.push(eq(tickets.subcontractorId, filters.subcontractorId));
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
        ilike(tickets.status, s),
        ilike(tickets.serviceOrder, s),
        ilike(tickets.projectName, s),
        ilike(tickets.state, s),
        ilike(tickets.ownerName, s),
        ilike(tickets.assignedToName, s),
        ilike(tickets.priority, s),
        ilike(tickets.warehouse, s),
        ilike(tickets.ownerEmail, s),
        ilike(tickets.assignedToEmail, s),
        ilike(tickets.deliveryOrPickup, s),
        ilike(tickets.deliveringTo, s),
        ilike(tickets.siteNameCoordinates, s),
        ilike(tickets.deliveryAddress, s),
        ilike(tickets.deliveryTimeSlots, s),
        ilike(tickets.driverKey, s),
        ilike(tickets.deliverySignoff, s),
        ilike(tickets.accessConditions, s),
        ilike(tickets.liftingEquipment, s),
        ilike(tickets.steelWork, s),
        ilike(tickets.receiversName, s),
        ilike(tickets.receiversPhone, s),
        ilike(tickets.pickupTime, s),
        ilike(tickets.subcontractorName, s),
        ilike(tickets.subcontractorEmail, s),
        ilike(tickets.internalComments, s),
        ilike(tickets.goodsReceipt, s),
        sql`CAST(${tickets.id} AS TEXT) ILIKE ${s}`,
        sql`CAST(${tickets.legacyId} AS TEXT) ILIKE ${s}`,
        sql`TO_CHAR(${tickets.requestedDeliveryDate}, 'YYYY-MM-DD') ILIKE ${s}`,
        sql`TO_CHAR(${tickets.pickupDate}, 'YYYY-MM-DD') ILIKE ${s}`,
        sql`TO_CHAR(${tickets.createdAt}, 'YYYY-MM-DD') ILIKE ${s}`,
        sql`TO_CHAR(${tickets.updatedAt}, 'YYYY-MM-DD') ILIKE ${s}`,
        sql`TO_CHAR(${tickets.closedAt}, 'YYYY-MM-DD') ILIKE ${s}`,
      ];
      conditions.push(or(...searchConds));
    }

    if (filters.columnFilters) {
      const ticketColumnMap: Record<string, any> = {
        id: tickets.id, status: tickets.status, serviceOrder: tickets.serviceOrder,
        projectName: tickets.projectName, state: tickets.state, ownerName: tickets.ownerName,
        assignedToName: tickets.assignedToName, priority: tickets.priority, warehouse: tickets.warehouse,
        ownerEmail: tickets.ownerEmail, assignedToEmail: tickets.assignedToEmail,
        deliveryOrPickup: tickets.deliveryOrPickup, deliveringTo: tickets.deliveringTo,
        siteNameCoordinates: tickets.siteNameCoordinates, deliveryAddress: tickets.deliveryAddress,
        deliveryTimeSlots: tickets.deliveryTimeSlots, driverKey: tickets.driverKey,
        deliverySignoff: tickets.deliverySignoff, accessConditions: tickets.accessConditions,
        liftingEquipment: tickets.liftingEquipment, steelWork: tickets.steelWork,
        receiversName: tickets.receiversName, receiversPhone: tickets.receiversPhone,
        pickupTime: tickets.pickupTime, subcontractorName: tickets.subcontractorName,
        subcontractorEmail: tickets.subcontractorEmail, internalComments: tickets.internalComments,
        goodsReceipt: tickets.goodsReceipt,
      };
      for (const [colKey, filterVal] of Object.entries(filters.columnFilters)) {
        if (!filterVal) continue;
        if (colKey === "id") {
          const numVal = parseInt(filterVal, 10);
          if (!isNaN(numVal)) {
            conditions.push(or(eq(tickets.id, numVal), eq(tickets.legacyId, numVal))!);
          }
          continue;
        }
        const col = ticketColumnMap[colKey];
        if (col) {
          conditions.push(ilike(col, `%${filterVal}%`));
        } else if (colKey === "requestedDeliveryDate" || colKey === "pickupDate" || colKey === "createdAt" || colKey === "updatedAt" || colKey === "closedAt") {
          conditions.push(sql`CAST(${colKey === "requestedDeliveryDate" ? tickets.requestedDeliveryDate : colKey === "pickupDate" ? tickets.pickupDate : colKey === "createdAt" ? tickets.createdAt : colKey === "updatedAt" ? tickets.updatedAt : tickets.closedAt} AS TEXT) ILIKE ${"%" + filterVal + "%"}`);
        }
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;

    const sortColumnMap: Record<string, any> = {
      id: tickets.legacyId, status: tickets.status, serviceOrder: tickets.serviceOrder,
      projectName: tickets.projectName, state: tickets.state, ownerName: tickets.ownerName,
      assignedToName: tickets.assignedToName, priority: tickets.priority, warehouse: tickets.warehouse,
      ownerEmail: tickets.ownerEmail, assignedToEmail: tickets.assignedToEmail,
      deliveryOrPickup: tickets.deliveryOrPickup, deliveringTo: tickets.deliveringTo,
      siteNameCoordinates: tickets.siteNameCoordinates, deliveryAddress: tickets.deliveryAddress,
      requestedDeliveryDate: tickets.requestedDeliveryDate, deliveryTimeSlots: tickets.deliveryTimeSlots,
      driverKey: tickets.driverKey, deliverySignoff: tickets.deliverySignoff,
      accessConditions: tickets.accessConditions, liftingEquipment: tickets.liftingEquipment,
      steelWork: tickets.steelWork, receiversName: tickets.receiversName,
      receiversPhone: tickets.receiversPhone, pickupDate: tickets.pickupDate,
      pickupTime: tickets.pickupTime, subcontractorName: tickets.subcontractorName,
      subcontractorEmail: tickets.subcontractorEmail, internalComments: tickets.internalComments,
      goodsReceipt: tickets.goodsReceipt, createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt, closedAt: tickets.closedAt,
    };

    let orderClause;
    if (filters.sortBy && sortColumnMap[filters.sortBy]) {
      const col = sortColumnMap[filters.sortBy];
      orderClause = filters.sortOrder === "asc" ? asc(col) : desc(col);
    } else {
      orderClause = desc(tickets.legacyId);
    }

    const [{ total: totalCount }] = await db.select({ total: count() }).from(tickets).where(whereClause);

    const rows = await db
      .select({
        ...getTableColumns(tickets),
        itemCount: sql<number>`(SELECT COUNT(*)::int FROM ticket_items WHERE ticket_items.ticket_id = tickets.id)`,
        itemServiceOrders: sql<string>`(SELECT STRING_AGG(DISTINCT ticket_items.service_order, ', ' ORDER BY ticket_items.service_order) FROM ticket_items WHERE ticket_items.ticket_id = tickets.id AND ticket_items.service_order IS NOT NULL AND ticket_items.service_order <> '')`,
      })
      .from(tickets).where(whereClause).orderBy(orderClause).limit(pageSize).offset((page - 1) * pageSize);

    return { tickets: rows, total: Number(totalCount) };
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async getTicketWithRelations(id: number): Promise<any> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;

    const items = await this.getTicketItems(id, ticket.direction);
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

  async getTicketItems(ticketId: number, direction?: string): Promise<TicketItem[]> {
    const conditions = [eq(ticketItems.ticketId, ticketId)];
    if (direction) {
      conditions.push(eq(ticketItems.direction, direction as any));
    }
    return db.select().from(ticketItems).where(and(...conditions)).orderBy(asc(ticketItems.id));
  }

  async upsertTicketItems(ticketId: number, items: InsertTicketItem[]): Promise<TicketItem[]> {
    const ticket = await db.select({ direction: tickets.direction }).from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket.length) {
      throw new Error(`Ticket ${ticketId} not found`);
    }
    const ticketDirection = ticket[0].direction;

    const result: TicketItem[] = [];
    for (const item of items) {
      if (item.direction && item.direction !== ticketDirection) {
        throw new Error(`Item direction "${item.direction}" does not match ticket direction "${ticketDirection}"`);
      }
      const [row] = await db.insert(ticketItems).values({ ...item, ticketId, direction: ticketDirection }).returning();
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

  async listWarehouses(): Promise<Warehouse[]> {
    return db.select().from(warehouses).orderBy(asc(warehouses.name));
  }

  async createWarehouse(w: InsertWarehouse): Promise<Warehouse> {
    const [created] = await db.insert(warehouses).values(w).returning();
    return created;
  }

  async updateWarehouse(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [updated] = await db.update(warehouses).set({ ...data, updatedAt: new Date() }).where(eq(warehouses.id, id)).returning();
    return updated;
  }

  async deleteWarehouse(id: number): Promise<void> {
    await db.delete(warehouses).where(eq(warehouses.id, id));
  }

  async listSubcontractors(): Promise<Subcontractor[]> {
    return db.select().from(subcontractors).orderBy(asc(subcontractors.name));
  }

  async getSubcontractor(id: number): Promise<Subcontractor | undefined> {
    const [sc] = await db.select().from(subcontractors).where(eq(subcontractors.id, id));
    return sc;
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

  async listAppRoles(): Promise<AppRole[]> {
    return db.select().from(appRoles).orderBy(asc(appRoles.sortOrder), asc(appRoles.key));
  }

  async createAppRole(r: InsertAppRole): Promise<AppRole> {
    const [created] = await db.insert(appRoles).values(r).returning();
    return created;
  }

  async updateAppRole(id: number, data: Partial<InsertAppRole>): Promise<AppRole | undefined> {
    const [updated] = await db.update(appRoles).set({ ...data, updatedAt: new Date() }).where(eq(appRoles.id, id)).returning();
    return updated;
  }

  async deleteAppRole(id: number): Promise<void> {
    await db.delete(appRoles).where(eq(appRoles.id, id));
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
  async getDashboardStats(direction?: string, status?: string): Promise<{ byProject: { name: string; count: number }[]; byMonth: { month: string; count: number; items: number }[] }> {
    const conditions: any[] = [];
    if (direction) conditions.push(eq(tickets.direction, direction as any));
    if (status) conditions.push(eq(tickets.status, status));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const projectRows = await db
      .select({ name: tickets.projectName, count: count() })
      .from(tickets)
      .where(whereClause)
      .groupBy(tickets.projectName)
      .orderBy(desc(count()));

    const monthRows = await db
      .select({
        month: sql<string>`TO_CHAR(${tickets.createdAt}, 'YYYY-MM')`,
        count: sql<number>`COUNT(DISTINCT ${tickets.id})`,
        items: sql<number>`COUNT(${ticketItems.id})`,
      })
      .from(tickets)
      .leftJoin(ticketItems, eq(ticketItems.ticketId, tickets.id))
      .where(whereClause)
      .groupBy(sql`TO_CHAR(${tickets.createdAt}, 'YYYY-MM')`)
      .orderBy(asc(sql`TO_CHAR(${tickets.createdAt}, 'YYYY-MM')`));

    return {
      byProject: projectRows.map(r => ({ name: r.name || "Unknown", count: Number(r.count) })),
      byMonth: monthRows.map(r => ({ month: r.month, count: Number(r.count), items: Number(r.items) })),
    };
  }

  async getDistinctColumnValues(direction: string, column: string, search?: string, subcontractorId?: number): Promise<string[]> {
    const colMap: Record<string, any> = {
      status: tickets.status, serviceOrder: tickets.serviceOrder,
      projectName: tickets.projectName, state: tickets.state, ownerName: tickets.ownerName,
      assignedToName: tickets.assignedToName, priority: tickets.priority, warehouse: tickets.warehouse,
      ownerEmail: tickets.ownerEmail, assignedToEmail: tickets.assignedToEmail,
      deliveryOrPickup: tickets.deliveryOrPickup, deliveringTo: tickets.deliveringTo,
      siteNameCoordinates: tickets.siteNameCoordinates, deliverySignoff: tickets.deliverySignoff,
      steelWork: tickets.steelWork, subcontractorName: tickets.subcontractorName,
      receiversName: tickets.receiversName, receiversPhone: tickets.receiversPhone,
      pickupTime: tickets.pickupTime, deliveryTimeSlots: tickets.deliveryTimeSlots,
      driverKey: tickets.driverKey, deliveryAddress: tickets.deliveryAddress,
      accessConditions: tickets.accessConditions, liftingEquipment: tickets.liftingEquipment,
      subcontractorEmail: tickets.subcontractorEmail, internalComments: tickets.internalComments,
      goodsReceipt: tickets.goodsReceipt,
    };
    const dateColMap: Record<string, any> = {
      requestedDeliveryDate: tickets.requestedDeliveryDate,
      pickupDate: tickets.pickupDate,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      closedAt: tickets.closedAt,
    };
    if (column === "itemServiceOrders" || column === "itemCount") {
      return [];
    }
    if (column === "id") {
      const conditions: any[] = [eq(tickets.direction, direction as any)];
      if (subcontractorId) conditions.push(eq(tickets.subcontractorId, subcontractorId));
      if (search) conditions.push(sql`CAST(${tickets.legacyId} AS TEXT) ILIKE ${'%' + search + '%'}`);
      const rows = await db.selectDistinct({ value: sql<string>`CAST(${tickets.legacyId} AS TEXT)` })
        .from(tickets).where(and(...conditions)).orderBy(asc(tickets.legacyId)).limit(100);
      return rows.map(r => r.value).filter((v): v is string => v != null && v !== "");
    }

    const dateCol = dateColMap[column];
    if (dateCol) {
      const conditions: any[] = [eq(tickets.direction, direction as any)];
      if (subcontractorId) conditions.push(eq(tickets.subcontractorId, subcontractorId));
      if (search) conditions.push(sql`TO_CHAR(${dateCol}, 'YYYY-MM-DD') ILIKE ${'%' + search + '%'}`);
      const rows = await db.selectDistinct({ value: sql<string>`TO_CHAR(${dateCol}, 'YYYY-MM-DD')` })
        .from(tickets).where(and(...conditions)).orderBy(asc(dateCol)).limit(100);
      return rows.map(r => r.value).filter((v): v is string => v != null && v !== "");
    }

    const col = colMap[column];
    if (!col) return [];

    const conditions: any[] = [eq(tickets.direction, direction as any)];
    if (subcontractorId) {
      conditions.push(eq(tickets.subcontractorId, subcontractorId));
    }
    if (search) {
      conditions.push(ilike(col, `%${search}%`));
    }

    const rows = await db
      .selectDistinct({ value: col })
      .from(tickets)
      .where(and(...conditions))
      .orderBy(asc(col))
      .limit(100);

    return rows.map(r => r.value).filter((v): v is string => v != null && v !== "");
  }
}

export const storage = new DatabaseStorage();
