import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Sanity Check ===\n");
  let allPassed = true;

  const check1 = await db.execute(sql`
    SELECT ti.ticket_id, array_agg(DISTINCT ti.direction) as item_dirs, t.direction as ticket_dir
    FROM ticket_items ti
    JOIN tickets t ON t.id = ti.ticket_id
    GROUP BY ti.ticket_id, t.direction
    HAVING COUNT(DISTINCT ti.direction) > 1
       OR (COUNT(DISTINCT ti.direction) = 1 AND MIN(ti.direction::text) <> t.direction::text)
  `);
  if (check1.rows.length === 0) {
    console.log("CHECK 1: PASS - No ticket has items of both directions or mismatched single direction");
  } else {
    console.log(`CHECK 1: FAIL - ${check1.rows.length} tickets have direction mismatches:`);
    check1.rows.slice(0, 10).forEach((r: any) =>
      console.log(`  ticket_id=${r.ticket_id} ticket_dir=${r.ticket_dir} item_dirs=${r.item_dirs}`)
    );
    allPassed = false;
  }

  const check2 = await db.execute(sql`
    SELECT COUNT(*)::int as cnt
    FROM ticket_items ti
    JOIN tickets t ON t.id = ti.ticket_id
    WHERE ti.direction <> t.direction
  `);
  const mismatchCount = check2.rows[0].cnt;
  if (mismatchCount === 0) {
    console.log("CHECK 2: PASS - No mismatched item directions exist");
  } else {
    console.log(`CHECK 2: FAIL - ${mismatchCount} items have direction != ticket direction`);
    allPassed = false;
  }

  const check3 = await db.execute(sql`
    SELECT COUNT(*)::int as cnt
    FROM ticket_items
    WHERE item_code IS NULL AND description IS NULL AND quantity IS NULL
  `);
  const blankCount = check3.rows[0].cnt;
  if (blankCount === 0) {
    console.log("CHECK 3: PASS - No blank item rows exist");
  } else {
    console.log(`CHECK 3: FAIL - ${blankCount} blank item rows found`);
    allPassed = false;
  }

  const check4 = await db.execute(sql`
    SELECT COUNT(*)::int as cnt
    FROM ticket_items ti
    JOIN tickets t_match ON t_match.legacy_id = ti.ticket_id AND t_match.id <> ti.ticket_id
    WHERE NOT EXISTS (SELECT 1 FROM tickets t_actual WHERE t_actual.id = ti.ticket_id)
  `);
  const orphanLegacy = (check4.rows[0] as any).cnt;
  if (orphanLegacy === 0) {
    console.log("CHECK 4: PASS - No items use a legacy_id as ticket_id (orphan check)");
  } else {
    console.log(`CHECK 4: FAIL - ${orphanLegacy} items use a legacy_id as ticket_id with no valid DB ticket`);
    allPassed = false;
  }

  console.log("\n--- SharePoint Ticket 733 Validation (legacy_id = 733) ---");
  const sp733 = await db.execute(sql`
    SELECT t.id AS db_ticket_id, t.legacy_id, t.direction,
           COUNT(i.id)::int AS item_count,
           array_agg(DISTINCT i.direction) FILTER (WHERE i.direction IS NOT NULL) AS item_dirs
    FROM tickets t
    LEFT JOIN ticket_items i ON i.ticket_id = t.id
    WHERE t.legacy_id = 733
    GROUP BY t.id, t.legacy_id, t.direction
  `);
  if (sp733.rows.length === 0) {
    console.log("  WARNING: No ticket found with legacy_id = 733");
  } else {
    const r: any = sp733.rows[0];
    console.log(`  db_ticket_id=${r.db_ticket_id} legacy_id=${r.legacy_id} direction=${r.direction} items=${r.item_count} item_dirs=${r.item_dirs}`);
    if (r.direction !== "OUTBOUND") {
      console.log("  CHECK: FAIL - SharePoint ticket 733 should be OUTBOUND");
      allPassed = false;
    } else if (r.item_count === 0) {
      console.log("  CHECK: WARN - No items found (may be expected if source data has none for this ticket)");
    } else if (r.item_dirs && r.item_dirs.length === 1 && r.item_dirs[0] === "OUTBOUND") {
      console.log("  CHECK: PASS - All items are OUTBOUND matching ticket direction");
    } else {
      console.log("  CHECK: FAIL - Items have unexpected directions");
      allPassed = false;
    }
  }

  const top10 = await db.execute(sql`
    SELECT ti.ticket_id, t.direction, t.legacy_id, COUNT(ti.id)::int as item_count
    FROM ticket_items ti
    JOIN tickets t ON t.id = ti.ticket_id
    GROUP BY ti.ticket_id, t.direction, t.legacy_id
    ORDER BY item_count DESC
    LIMIT 10
  `);
  console.log("\nTop 10 tickets by item count:");
  top10.rows.forEach((r: any) =>
    console.log(`  db_id=${r.ticket_id} legacy_id=${r.legacy_id} direction=${r.direction} items=${r.item_count}`)
  );

  console.log(`\n=== Overall: ${allPassed ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"} ===`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Sanity check failed:", err);
  process.exit(1);
});
