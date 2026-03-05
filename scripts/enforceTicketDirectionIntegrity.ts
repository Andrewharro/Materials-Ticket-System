import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Enforce Ticket Direction Integrity ===\n");

  const mismatch = await db.execute(sql`
    DELETE FROM ticket_items ti
    USING tickets t
    WHERE ti.ticket_id = t.id AND ti.direction <> t.direction
  `);
  const mismatchCount = mismatch.rowCount ?? 0;
  console.log(`Deleted ${mismatchCount} mismatched-direction item rows`);

  const blank = await db.execute(sql`
    DELETE FROM ticket_items
    WHERE item_code IS NULL AND description IS NULL AND quantity IS NULL
  `);
  const blankCount = blank.rowCount ?? 0;
  console.log(`Deleted ${blankCount} blank item rows (null code, description, quantity)`);

  console.log("\n=== Integrity Cleanup Complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Integrity fix failed:", err);
  process.exit(1);
});
