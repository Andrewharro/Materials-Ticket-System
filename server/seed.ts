import { db } from "./db";
import { users, ticketStatuses, appRoles } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function seed() {
  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@example.com"));
  if (existingAdmin.length === 0) {
    const hash = await bcrypt.hash("ChangeMe123!", 10);
    await db.insert(users).values({
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
      passwordHash: hash,
    });
    console.log("Seeded admin user: admin@example.com / ChangeMe123!");
  }

  const existingStatuses = await db.select().from(ticketStatuses);
  if (existingStatuses.length === 0) {
    await db.insert(ticketStatuses).values([
      { title: "New", key: "NEW", sortOrder: 1 },
      { title: "Open", key: "OPEN", sortOrder: 2 },
      { title: "On Hold", key: "ON_HOLD", sortOrder: 3 },
      { title: "Closed", key: "CLOSED", sortOrder: 4 },
      { title: "Not Assigned", key: "NOT_ASSIGNED", sortOrder: 5 },
    ]);
    console.log("Seeded default ticket statuses");
  }

  const existingRoles = await db.select().from(appRoles);
  if (existingRoles.length === 0) {
    await db.insert(appRoles).values([
      { key: "USER", label: "User", description: "Can create tickets and edit own drafts", sortOrder: 1 },
      { key: "COORDINATOR", label: "Coordinator", description: "Can edit any ticket, gets assigned tickets", sortOrder: 2 },
      { key: "ADMIN", label: "Admin", description: "Full access including settings and user management", sortOrder: 3 },
    ]);
    console.log("Seeded default roles");
  }
}
