import { execSync } from "child_process";

function run(cmd: string, label: string) {
  console.log(`\n→ ${label}`);
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Materials OS — Bootstrap               ║");
  console.log("╚══════════════════════════════════════════╝");

  if (!process.env.DATABASE_URL) {
    console.error("\n✗ DATABASE_URL is not set.");
    console.error("  Copy .env.example to .env and configure it:");
    console.error("    cp .env.example .env");
    console.error("  Then run this script again.\n");
    process.exit(1);
  }

  console.log("\n✓ DATABASE_URL is set");

  run("npx drizzle-kit push", "Pushing database schema (drizzle-kit push)");

  console.log("\n✓ Database schema applied");

  run("tsx -e \"import('./server/seed.ts').then(m => m.seed())\"", "Running seed (admin user + statuses + roles)");

  console.log("\n✓ Seed complete");

  console.log("\n──────────────────────────────────────────");
  console.log("  Bootstrap finished successfully!");
  console.log("──────────────────────────────────────────");
  console.log("\n  Next steps:");
  console.log("    1. npm run dev                         — start the dev server");
  console.log("    2. npm run import:sharepoint            — import data from XLSX files");
  console.log("    3. npm run export-db                    — export DB to JSON files");
  console.log("\n  Default admin login:");
  console.log("    Email:    admin@example.com");
  console.log("    Password: ChangeMe123!\n");
}

main().catch((err) => {
  console.error("\nBootstrap failed:", err.message);
  process.exit(1);
});
