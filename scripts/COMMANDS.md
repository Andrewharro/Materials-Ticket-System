# Available Commands

## Development
```bash
npm run dev                    # Start dev server (backend + frontend)
npm run dev:client             # Start Vite frontend only
npm run check                  # TypeScript type-check
npm run build                  # Production build
npm run start                  # Start production server
```

## Database
```bash
npm run db:push                # Push Drizzle schema to PostgreSQL
npm run export-db              # Export all tables to JSON (db_export/)
npm run import:sharepoint      # Import data from XLSX files (attached_assets/import/)
```

## Docker (local development)
```bash
docker compose up -d           # Start local PostgreSQL
docker compose down            # Stop local PostgreSQL
docker compose down -v         # Stop and delete all data
```

## Bootstrap (first-time setup)
```bash
npx tsx scripts/bootstrap.ts   # Verify DB, push schema, run seed
```

## Utility Scripts
```bash
npx tsx scripts/sanityCheck.ts                      # Validate data integrity
npx tsx scripts/enforceTicketDirectionIntegrity.ts   # Fix ticket direction data
npx tsx scripts/migrateInternalComments.ts           # Migrate internal comments
npx tsx scripts/remapTicketItemsTicketId.ts          # Remap ticket item IDs
```
