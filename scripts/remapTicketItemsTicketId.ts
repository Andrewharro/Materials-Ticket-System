import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Remap ticket_items.ticket_id from legacy_id to DB id ===\n");

  const before = await db.execute(sql`
    SELECT COUNT(*)::int as cnt
    FROM ticket_items ti
    JOIN tickets t ON t.legacy_id = ti.ticket_id
    WHERE t.id <> ti.ticket_id
  `);
  console.log(`Found ${before.rows[0].cnt} items where ticket_id matches a legacy_id of a different ticket\n`);

  const remapped = await db.execute(sql`
    UPDATE ticket_items ti
    SET ticket_id = t.id
    FROM tickets t
    WHERE t.legacy_id = ti.ticket_id
      AND t.id <> ti.ticket_id
  `);
  console.log(`Remapped ${remapped.rowCount ?? 0} item rows to correct DB ticket IDs`);

  const dirCleanup = await db.execute(sql`
    DELETE FROM ticket_items ti
    USING tickets t
    WHERE ti.ticket_id = t.id AND ti.direction <> t.direction
  `);
  console.log(`Deleted ${dirCleanup.rowCount ?? 0} direction-mismatched item rows after remap`);

  const orphans = await db.execute(sql`
    SELECT COUNT(*)::int as cnt
    FROM ticket_items ti
    WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.id = ti.ticket_id)
  `);
  console.log(`Orphaned items (no matching ticket): ${orphans.rows[0].cnt}`);

  console.log("\n=== Remap Complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Remap failed:", err);
  process.exit(1);
});
