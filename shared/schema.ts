import {
  pgTable, pgEnum, serial, text, varchar, integer, boolean, timestamp, decimal, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const ticketDirectionEnum = pgEnum("ticket_direction", ["INBOUND", "OUTBOUND"]);
export const ticketStatusKeyEnum = pgEnum("ticket_status_key", [
  "NEW", "OPEN", "ON_HOLD", "CLOSED", "NOT_ASSIGNED", "OTHER",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("USER"),
  subcontractorId: integer("subcontractor_id"),
  isActive: boolean("is_active").notNull().default(true),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  createdTickets: many(tickets, { relationName: "ticketCreatedBy" }),
  assignedTickets: many(tickets, { relationName: "ticketAssignedTo" }),
  messages: many(ticketMessages),
}));

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  direction: ticketDirectionEnum("direction").notNull(),
  status: varchar("status", { length: 100 }).notNull(),
  statusKey: ticketStatusKeyEnum("status_key").notNull().default("OTHER"),
  priority: varchar("priority", { length: 100 }),
  state: varchar("state", { length: 100 }),
  projectName: varchar("project_name", { length: 500 }),
  warehouse: varchar("warehouse", { length: 255 }),
  serviceOrder: varchar("service_order", { length: 255 }),
  ownerName: varchar("owner_name", { length: 255 }),
  ownerEmail: varchar("owner_email", { length: 255 }),
  assignedToName: varchar("assigned_to_name", { length: 255 }),
  assignedToEmail: varchar("assigned_to_email", { length: 255 }),
  createdByUserId: integer("created_by_user_id"),
  assignedToUserId: integer("assigned_to_user_id"),
  deliveryOrPickup: varchar("delivery_or_pickup", { length: 100 }),
  deliveringTo: varchar("delivering_to", { length: 500 }),
  siteNameCoordinates: varchar("site_name_coordinates", { length: 500 }),
  deliveryAddress: text("delivery_address"),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  deliveryTimeSlots: varchar("delivery_time_slots", { length: 255 }),
  driverKey: varchar("driver_key", { length: 255 }),
  deliverySignoff: varchar("delivery_signoff", { length: 255 }),
  accessConditions: text("access_conditions"),
  liftingEquipment: text("lifting_equipment"),
  steelWork: text("steel_work"),
  receiversName: varchar("receivers_name", { length: 255 }),
  receiversPhone: varchar("receivers_phone", { length: 100 }),
  pickupDate: timestamp("pickup_date"),
  pickupTime: varchar("pickup_time", { length: 100 }),
  subcontractorId: integer("subcontractor_id"),
  subcontractorName: varchar("subcontractor_name", { length: 255 }),
  subcontractorEmail: varchar("subcontractor_email", { length: 255 }),
  internalComments: text("internal_comments"),
  goodsReceipt: text("goods_receipt"),
  legacyId: integer("legacy_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("idx_tickets_direction_status").on(table.direction, table.statusKey),
  index("idx_tickets_status").on(table.status),
  index("idx_tickets_created_by").on(table.createdByUserId),
  index("idx_tickets_assigned_to").on(table.assignedToUserId),
  index("idx_tickets_service_order").on(table.serviceOrder),
  index("idx_tickets_project").on(table.projectName),
  index("idx_tickets_state").on(table.state),
]);

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  createdByUser: one(users, { fields: [tickets.createdByUserId], references: [users.id], relationName: "ticketCreatedBy" }),
  assignedToUser: one(users, { fields: [tickets.assignedToUserId], references: [users.id], relationName: "ticketAssignedTo" }),
  subcontractor: one(subcontractors, { fields: [tickets.subcontractorId], references: [subcontractors.id] }),
  items: many(ticketItems),
  messages: many(ticketMessages),
  emailLogs: many(emailLogs),
}));

export const ticketItems = pgTable("ticket_items", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  direction: ticketDirectionEnum("direction").notNull(),
  itemCode: varchar("item_code", { length: 255 }),
  description: text("description"),
  uom: varchar("uom", { length: 50 }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 100 }),
  comments: text("comments"),
  serviceOrder: varchar("service_order", { length: 255 }),
  legacyId: integer("legacy_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_items_ticket").on(table.ticketId),
  index("idx_items_direction").on(table.direction),
  index("idx_items_code").on(table.itemCode),
]);

export const ticketItemsRelations = relations(ticketItems, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketItems.ticketId], references: [tickets.id] }),
}));

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderUserId: integer("sender_user_id").notNull(),
  messageText: text("message_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_messages_ticket_time").on(table.ticketId, table.createdAt),
  index("idx_messages_sender").on(table.senderUserId),
]);

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketMessages.ticketId], references: [tickets.id] }),
  sender: one(users, { fields: [ticketMessages.senderUserId], references: [users.id] }),
}));

export const subcontractors = pgTable("subcontractors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  receiversName: varchar("receivers_name", { length: 255 }),
  receiversContact: varchar("receivers_contact", { length: 255 }),
  address: text("address"),
  project: varchar("project", { length: 500 }),
  legacyId: integer("legacy_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_subcontractors_name").on(table.name),
  index("idx_subcontractors_project").on(table.project),
]);

export const subcontractorsRelations = relations(subcontractors, ({ many }) => ({
  tickets: many(tickets),
}));

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order"),
  legacyId: integer("legacy_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const departmentsRelations = relations(departments, ({ many }) => ({
  techs: many(departmentTechs),
}));

export const departmentTechs = pgTable("department_techs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  departmentId: integer("department_id"),
  legacyId: integer("legacy_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_techs_department").on(table.departmentId),
  index("idx_techs_name").on(table.name),
]);

export const departmentTechsRelations = relations(departmentTechs, ({ one }) => ({
  department: one(departments, { fields: [departmentTechs.departmentId], references: [departments.id] }),
}));

export const ticketStatuses = pgTable("ticket_statuses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order"),
  key: ticketStatusKeyEnum("key").notNull().default("OTHER"),
  legacyId: integer("legacy_id").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_statuses_sort").on(table.sortOrder),
]);

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id"),
  messageId: integer("message_id"),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyPreview: text("body_preview"),
  status: varchar("status", { length: 50 }).notNull(),
  errorText: text("error_text"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => [
  index("idx_email_ticket").on(table.ticketId),
  index("idx_email_message").on(table.messageId),
  index("idx_email_to").on(table.toEmail),
]);

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  ticket: one(tickets, { fields: [emailLogs.ticketId], references: [tickets.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const insertTicketItemSchema = createInsertSchema(ticketItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicketItem = z.infer<typeof insertTicketItemSchema>;
export type TicketItem = typeof ticketItems.$inferSelect;

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

export const insertSubcontractorSchema = createInsertSchema(subcontractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubcontractor = z.infer<typeof insertSubcontractorSchema>;
export type Subcontractor = typeof subcontractors.$inferSelect;

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export const insertDepartmentTechSchema = createInsertSchema(departmentTechs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDepartmentTech = z.infer<typeof insertDepartmentTechSchema>;
export type DepartmentTech = typeof departmentTechs.$inferSelect;

export const insertTicketStatusSchema = createInsertSchema(ticketStatuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicketStatus = z.infer<typeof insertTicketStatusSchema>;
export type TicketStatus = typeof ticketStatuses.$inferSelect;

export const appRoles = pgTable("app_roles", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppRoleSchema = createInsertSchema(appRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAppRole = z.infer<typeof insertAppRoleSchema>;
export type AppRole = typeof appRoles.$inferSelect;

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
