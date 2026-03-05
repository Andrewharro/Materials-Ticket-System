import pg from "pg";
import fs from "fs";
import path from "path";

const EXPORT_DIR = path.join(process.cwd(), "db_export");

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows: tables } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );

  if (tables.length === 0) {
    console.log("No tables found in the database.");
    await client.end();
    return;
  }

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  console.log(`\nExporting ${tables.length} tables to ${EXPORT_DIR}\n`);
  console.log("─".repeat(50));

  let totalRows = 0;
  const summary: { table: string; rows: number }[] = [];

  for (const { table_name } of tables) {
    const { rows } = await client.query(`SELECT * FROM "${table_name}"`);
    const filePath = path.join(EXPORT_DIR, `${table_name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));

    summary.push({ table: table_name, rows: rows.length });
    totalRows += rows.length;
    console.log(`  ✓ ${table_name.padEnd(30)} ${rows.length} rows`);
  }

  console.log("─".repeat(50));
  console.log(`\nSummary:`);
  console.log(`  Tables exported: ${summary.length}`);
  console.log(`  Total rows:      ${totalRows}`);
  console.log(`  Export folder:   ${EXPORT_DIR}\n`);

  await client.end();
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
