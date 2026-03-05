import XLSX from "xlsx";
import path from "path";
import { db } from "../server/db";
import {
  users, tickets, ticketItems, subcontractors,
  departments, departmentTechs, ticketStatuses,
} from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

const IMPORT_DIR = path.resolve(import.meta.dirname, "..", "attached_assets", "import");

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[\s_]/g, "");
}

function readXlsx(filename: string): Record<string, any>[] {
  const filePath = path.join(IMPORT_DIR, filename);
  try {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (raw.length < 2) return [];
    const headers = raw[0].map((h: any) => String(h || "").trim());
    const normalizedHeaders = headers.map(normalizeKey);
    const rows: Record<string, any>[] = [];
    for (let i = 1; i < raw.length; i++) {
      const row: Record<string, any> = {};
      for (let j = 0; j < headers.length; j++) {
        row[normalizedHeaders[j]] = raw[i]?.[j] ?? null;
      }
      rows.push(row);
    }
    return rows;
  } catch (e: any) {
    console.warn(`  Warning: Could not read ${filename}: ${e.message}`);
    return [];
  }
}

function col(row: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (row[nk] !== undefined && row[nk] !== null && row[nk] !== "") return row[nk];
  }
  return null;
}

function parseDate(val: any): Date | null {
  if (val == null) return null;
  if (typeof val === "number") {
    if (val > 25569) {
      const d = new Date((val - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function str(val: any, maxLen?: number): string | null {
  if (val == null || val === "") return null;
  const s = String(val).trim();
  return maxLen ? s.substring(0, maxLen) : s;
}

function num(val: any): string | null {
  if (val == null || val === "") return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : String(n);
}

function intVal(val: any): number | null {
  if (val == null || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function splitName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName || !fullName.trim()) return { firstName: "Unknown", lastName: "Unknown" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "Unknown" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mapStatusKey(title: string): "NEW" | "OPEN" | "ON_HOLD" | "CLOSED" | "NOT_ASSIGNED" | "OTHER" {
  const t = title.toLowerCase().trim();
  if (t === "new") return "NEW";
  if (t === "open" || t === "in progress") return "OPEN";
  if (t.includes("hold")) return "ON_HOLD";
  if (t === "closed") return "CLOSED";
  if (t.includes("not assigned")) return "NOT_ASSIGNED";
  return "OTHER";
}

async function importTicketStatuses() {
  console.log("\n--- Importing Ticket Statuses ---");
  const rows = readXlsx("TicketStatus.xlsx");
  let inserted = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const title = str(col(row, "Title"));
    if (!title) { skipped++; continue; }

    const legacyId = intVal(col(row, "ID"));
    const data = {
      title,
      description: str(col(row, "Description")),
      sortOrder: intVal(col(row, "SortOrder")),
      key: mapStatusKey(title),
      legacyId,
    };

    if (legacyId) {
      const byLegacy = await db.select().from(ticketStatuses).where(eq(ticketStatuses.legacyId, legacyId));
      if (byLegacy.length > 0) {
        await db.update(ticketStatuses).set(data).where(eq(ticketStatuses.id, byLegacy[0].id));
        updated++;
        continue;
      }
    }

    const byTitle = await db.select().from(ticketStatuses).where(eq(ticketStatuses.title, title));
    if (byTitle.length > 0) {
      await db.update(ticketStatuses).set(data).where(eq(ticketStatuses.id, byTitle[0].id));
      updated++;
    } else {
      await db.insert(ticketStatuses).values(data);
      inserted++;
    }
  }
  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
}

async function importDepartments(): Promise<Map<number, number>> {
  console.log("\n--- Importing Departments ---");
  const rows = readXlsx("Departments.xlsx");
  let inserted = 0, updated = 0, skipped = 0;
  const legacyToDeptId = new Map<number, number>();

  for (const row of rows) {
    const title = str(col(row, "Title"));
    if (!title) { skipped++; continue; }

    const legacyId = intVal(col(row, "ID"));
    const data = {
      title,
      description: str(col(row, "Description")),
      sortOrder: intVal(col(row, "SortOrder")),
      legacyId,
    };

    if (legacyId) {
      const byLegacy = await db.select().from(departments).where(eq(departments.legacyId, legacyId));
      if (byLegacy.length > 0) {
        await db.update(departments).set(data).where(eq(departments.id, byLegacy[0].id));
        legacyToDeptId.set(legacyId, byLegacy[0].id);
        updated++;
        continue;
      }
    }

    const byTitle = await db.select().from(departments).where(eq(departments.title, title));
    if (byTitle.length > 0) {
      await db.update(departments).set(data).where(eq(departments.id, byTitle[0].id));
      if (legacyId) legacyToDeptId.set(legacyId, byTitle[0].id);
      updated++;
    } else {
      const [created] = await db.insert(departments).values(data).returning();
      if (legacyId) legacyToDeptId.set(legacyId, created.id);
      inserted++;
    }
  }
  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  return legacyToDeptId;
}

async function importDepartmentTechs(legacyToDeptId: Map<number, number>) {
  console.log("\n--- Importing Department Techs ---");
  const rows = readXlsx("DepartmentTechs.xlsx");
  let inserted = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const name = str(col(row, "Title", "Name"));
    if (!name) { skipped++; continue; }

    const legacyId = intVal(col(row, "ID"));
    const deptLegacyId = intVal(col(row, "DepartmentID", "DepartmentId", "Department"));
    const departmentId = deptLegacyId ? legacyToDeptId.get(deptLegacyId) || null : null;

    const data = {
      name,
      email: str(col(row, "Email")),
      departmentId,
      legacyId,
    };

    if (legacyId) {
      const byLegacy = await db.select().from(departmentTechs).where(eq(departmentTechs.legacyId, legacyId));
      if (byLegacy.length > 0) {
        await db.update(departmentTechs).set(data).where(eq(departmentTechs.id, byLegacy[0].id));
        updated++;
        continue;
      }
    }

    const byName = await db.select().from(departmentTechs).where(eq(departmentTechs.name, name));
    if (byName.length > 0) {
      await db.update(departmentTechs).set(data).where(eq(departmentTechs.id, byName[0].id));
      updated++;
    } else {
      await db.insert(departmentTechs).values(data);
      inserted++;
    }
  }
  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
}

async function importSubcontractors() {
  console.log("\n--- Importing Subcontractors ---");
  const rows = readXlsx("MTSSubcontractorDetails.xlsx");
  let inserted = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const name = str(col(row, "SubContractorName", "Name", "Title"));
    if (!name) { skipped++; continue; }

    const data = {
      name,
      email: str(col(row, "Email")),
      receiversName: str(col(row, "ReceiversName")),
      receiversContact: str(col(row, "ReceiversContact")),
      address: str(col(row, "Address")),
      project: str(col(row, "Project")),
    };

    const conditions = [eq(subcontractors.name, name)];
    if (data.project) {
      conditions.push(eq(subcontractors.project, data.project));
    }
    const existing = await db.select().from(subcontractors).where(and(...conditions));
    if (existing.length > 0) {
      await db.update(subcontractors).set(data).where(eq(subcontractors.id, existing[0].id));
      updated++;
    } else {
      await db.insert(subcontractors).values(data);
      inserted++;
    }
  }
  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  return db.select().from(subcontractors);
}

async function ensureUsers(ticketRows: Record<string, any>[]) {
  console.log("\n--- Deriving Users from Tickets ---");
  const emailMap = new Map<string, { name: string; isAssigned: boolean }>();

  for (const row of ticketRows) {
    const ownerEmail = str(col(row, "OwnerEmail"));
    const ownerName = str(col(row, "OwnerName"));
    if (ownerEmail && !emailMap.has(ownerEmail.toLowerCase())) {
      emailMap.set(ownerEmail.toLowerCase(), { name: ownerName || "", isAssigned: false });
    }

    const assignedEmail = str(col(row, "AssignedToEmail"));
    const assignedName = str(col(row, "AssignedTo", "AssignedToName"));
    if (assignedEmail && !emailMap.has(assignedEmail.toLowerCase())) {
      emailMap.set(assignedEmail.toLowerCase(), { name: assignedName || "", isAssigned: true });
    }
  }

  let inserted = 0, existing = 0;
  const userIdMap = new Map<string, number>();

  for (const [email, info] of emailMap) {
    const found = await db.select().from(users).where(eq(users.email, email));
    if (found.length > 0) {
      userIdMap.set(email, found[0].id);
      existing++;
      continue;
    }

    const { firstName, lastName } = splitName(info.name);
    const role = info.isAssigned ? "COORDINATOR" : "USER";

    const [created] = await db.insert(users).values({
      email,
      firstName,
      lastName,
      role,
      isActive: true,
    }).returning();
    userIdMap.set(email, created.id);
    inserted++;
  }

  console.log(`  New users: ${inserted}, Existing: ${existing}, Total emails: ${emailMap.size}`);
  return userIdMap;
}

async function importTickets(
  userIdMap: Map<string, number>,
  subcontractorList: { id: number; name: string }[]
) {
  console.log("\n--- Importing Tickets ---");
  const rows = readXlsx("Tickets.xlsx");
  let inserted = 0, updated = 0, skipped = 0, invalidDirection = 0;
  const legacyToNewId = new Map<number, number>();

  const subMap = new Map<string, number>();
  for (const s of subcontractorList) {
    subMap.set(s.name.toLowerCase(), s.id);
  }

  for (const row of rows) {
    const legacyId = intVal(col(row, "ID"));
    if (!legacyId) { skipped++; continue; }

    const directionRaw = (str(col(row, "Direction")) || "").toLowerCase();
    let direction: "INBOUND" | "OUTBOUND";
    if (directionRaw.includes("inbound")) {
      direction = "INBOUND";
    } else if (directionRaw.includes("outbound")) {
      direction = "OUTBOUND";
    } else {
      invalidDirection++;
      direction = "OUTBOUND";
    }

    const statusTitle = str(col(row, "Status")) || "New";
    const ownerEmail = str(col(row, "OwnerEmail"))?.toLowerCase() || null;
    const assignedEmail = str(col(row, "AssignedToEmail"))?.toLowerCase() || null;
    const subName = str(col(row, "SubContractor", "Subcontractor"));

    const data: any = {
      direction,
      status: statusTitle,
      statusKey: mapStatusKey(statusTitle),
      priority: str(col(row, "Priority"), 100),
      state: str(col(row, "State"), 100),
      projectName: str(col(row, "ProjectName"), 500),
      warehouse: str(col(row, "Warehouse"), 255),
      serviceOrder: str(col(row, "ServiceOrder"), 255),
      ownerName: str(col(row, "OwnerName"), 255),
      ownerEmail: str(col(row, "OwnerEmail"), 255),
      assignedToName: str(col(row, "AssignedTo", "AssignedToName"), 255),
      assignedToEmail: str(col(row, "AssignedToEmail"), 255),
      createdByUserId: ownerEmail ? userIdMap.get(ownerEmail) || null : null,
      assignedToUserId: assignedEmail ? userIdMap.get(assignedEmail) || null : null,
      deliveryOrPickup: str(col(row, "DeliveryOrPickup"), 100),
      deliveringTo: str(col(row, "DeliveringTo"), 500),
      siteNameCoordinates: str(col(row, "SiteNameCoordinates"), 500),
      deliveryAddress: str(col(row, "DeliveryAddress")),
      requestedDeliveryDate: parseDate(col(row, "RequestedDeliveryDate")),
      deliveryTimeSlots: str(col(row, "DeliveryTimeSlots"), 255),
      driverKey: str(col(row, "DriverKey"), 255),
      deliverySignoff: str(col(row, "DeliverySignoff"), 255),
      accessConditions: str(col(row, "AccessConditions")),
      liftingEquipment: str(col(row, "LiftingEquipment")),
      steelWork: str(col(row, "SteelWork")),
      receiversName: str(col(row, "ReceiversName"), 255),
      receiversPhone: str(col(row, "ReceiversPhone"), 100),
      pickupDate: parseDate(col(row, "PickupDate")),
      pickupTime: str(col(row, "PickupTime"), 100),
      subcontractorName: str(col(row, "SubContractor", "Subcontractor"), 255),
      subcontractorEmail: str(col(row, "SubContractorEmail", "SubcontractorEmail"), 255),
      subcontractorId: subName ? subMap.get(subName.toLowerCase()) || null : null,
      internalComments: str(col(row, "InternalComments")),
      goodsReceipt: str(col(row, "GoodsReceipt")),
      legacyId,
      createdAt: parseDate(col(row, "Created")) || new Date(),
      updatedAt: parseDate(col(row, "Modified")) || new Date(),
      closedAt: parseDate(col(row, "DateClosed")),
    };

    const existing = await db.select().from(tickets).where(eq(tickets.legacyId, legacyId));
    if (existing.length > 0) {
      await db.update(tickets).set(data).where(eq(tickets.id, existing[0].id));
      legacyToNewId.set(legacyId, existing[0].id);
      updated++;
    } else {
      const [created] = await db.insert(tickets).values(data).returning();
      legacyToNewId.set(legacyId, created.id);
      inserted++;
    }
  }

  if (invalidDirection > 0) {
    console.log(`  Warning: ${invalidDirection} tickets had unrecognised direction (defaulted to OUTBOUND)`);
  }
  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  return legacyToNewId;
}

async function importItems(
  filename: string,
  direction: "INBOUND" | "OUTBOUND",
  legacyToNewId: Map<number, number>
) {
  console.log(`\n--- Importing ${direction} Items from ${filename} ---`);
  const rows = readXlsx(filename);
  let inserted = 0, updated = 0, skipped = 0, missingTicket = 0;

  for (const row of rows) {
    const legacyTicketId = intVal(col(row, "TicketID"));
    if (!legacyTicketId) { skipped++; continue; }

    const newTicketId = legacyToNewId.get(legacyTicketId);
    if (!newTicketId) { missingTicket++; continue; }

    const legacyId = intVal(col(row, "ID"));

    const data: any = {
      ticketId: newTicketId,
      direction,
      itemCode: str(col(row, "ItemCode"), 255),
      description: str(col(row, "Description")),
      uom: str(col(row, "UOM", "Uom"), 50),
      quantity: num(col(row, "Quantity")),
      status: str(col(row, "Status"), 100),
      comments: str(col(row, "Comments")),
      serviceOrder: str(col(row, "ServiceOrder"), 255),
      legacyId,
      createdAt: parseDate(col(row, "Created")) || new Date(),
      updatedAt: parseDate(col(row, "Modified")) || new Date(),
    };

    if (legacyId) {
      const existing = await db.select().from(ticketItems).where(eq(ticketItems.legacyId, legacyId));
      if (existing.length > 0) {
        await db.update(ticketItems).set(data).where(eq(ticketItems.id, existing[0].id));
        updated++;
        continue;
      }
    }

    await db.insert(ticketItems).values(data);
    inserted++;
  }

  console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}, Missing ticket: ${missingTicket}`);
}

async function main() {
  console.log("=== SharePoint XLSX Importer ===");
  console.log(`Import directory: ${IMPORT_DIR}\n`);

  await importTicketStatuses();
  const legacyToDeptId = await importDepartments();
  await importDepartmentTechs(legacyToDeptId);
  const subcontractorList = await importSubcontractors();

  const ticketRows = readXlsx("Tickets.xlsx");
  const userIdMap = await ensureUsers(ticketRows);
  const legacyToNewId = await importTickets(userIdMap, subcontractorList);

  await importItems("ItemsInbound.xlsx", "INBOUND", legacyToNewId);
  await importItems("ItemsOutbound.xlsx", "OUTBOUND", legacyToNewId);

  console.log("\n=== Import Complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
