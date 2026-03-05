# Materials OS — Ticketing System

## Overview
Full-stack materials ticketing system replacing a Power Apps + SharePoint solution. Manages inbound and outbound material tickets with role-based access, chat/messaging, and email notifications.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT (Bearer token in Authorization header)
- **Routing**: wouter (frontend), Express (backend)

## Key Files
- `shared/schema.ts` — Drizzle schema (all tables, enums, types)
- `server/index.ts` — Express server entry point (seeds DB on start)
- `server/routes.ts` — All API routes
- `server/storage.ts` — Database CRUD operations via Drizzle
- `server/auth.ts` — JWT authentication + role guard middleware
- `server/emailService.ts` — Nodemailer email + EmailLog
- `server/db.ts` — Drizzle + pg pool
- `server/seed.ts` — Default admin user + ticket statuses
- `scripts/importSharePoint.ts` — One-off XLSX importer for SharePoint data
- `client/src/App.tsx` — React Router with protected routes
- `client/src/lib/auth.ts` — Frontend auth helpers (token, apiFetch)
- `client/src/components/Sidebar.tsx` — Navigation sidebar
- `client/src/components/TicketTable.tsx` — Ticket list with dynamic column picker + saved views (localStorage)
- `client/src/pages/` — Dashboard, InboundTickets, OutboundTickets, TicketDetail, SettingsUsers, SettingsReferenceData, Login

## Data Model
Tables: users, tickets, ticket_items, ticket_messages, subcontractors, departments, department_techs, ticket_statuses, app_settings, email_logs
Enums: user_role (USER/COORDINATOR/ADMIN), ticket_direction (INBOUND/OUTBOUND), ticket_status_key

## Imported Data (from SharePoint XLSX)
- 1,869 tickets with legacy IDs; Excel TicketID = SharePoint ID = tickets.legacy_id (NOT tickets.id)
- 39,572 ticket items (1,592 inbound + 37,980 outbound); batch-imported
- Relationship: Tickets.xlsx [ID] = tickets.legacy_id; ItemsInbound [TicketID] → INBOUND tickets; ItemsOutbound [TicketID] → OUTBOUND tickets
- Item direction matches file source: ItemsInbound→INBOUND, ItemsOutbound→OUTBOUND; validated against ticket direction
- Items linked via composite unique key (legacyId, direction); direction integrity enforced
- 49 subcontractors, 13 departments, 11 department techs, 6 ticket statuses
- 34 users derived from ticket owner/assigned emails

## Data Integrity Scripts
- `npx tsx scripts/remapTicketItemsTicketId.ts` — One-time fix: remaps ticket_items.ticket_id from legacy_id to DB id
- `npx tsx scripts/enforceTicketDirectionIntegrity.ts` — Deletes mismatched-direction items and blank rows
- `npx tsx scripts/importSharePoint.ts` — XLSX importer (idempotent upsert; maps TicketID→legacy_id→db id; direction from ticket)
- `npx tsx scripts/sanityCheck.ts` — Verifies no direction/mapping mismatches, validates SharePoint ticket 733

## Roles
- **USER**: Can create tickets, edit own drafts, post messages
- **COORDINATOR**: Can edit any ticket, gets assigned tickets
- **ADMIN**: Full access including Settings (users, reference data)

## API Endpoints
- Auth: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- Tickets: GET /api/tickets, GET /api/tickets/:id, POST /api/tickets, POST /api/tickets/:id/save, POST /api/tickets/:id/messages
- Admin: CRUD /api/admin/users, /api/admin/statuses, /api/admin/departments, /api/admin/department-techs, /api/admin/subcontractors

## Environment Variables
- DATABASE_URL — PostgreSQL connection (auto-set by Replit)
- JWT_SECRET — Secret for JWT signing (falls back to dev default)
- SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM — Email (optional, logs when not configured)
- COORDINATOR_GROUP_EMAIL — Fallback email for unassigned tickets

## Commands
- `npm run dev` — Start dev server (port 5000)
- `npm run db:push` — Push schema to database
- `npm run build` — Production build
- `npm run start` — Production server
- `npm run import:sharepoint` — Run XLSX importer (one-off)

## Default Login
- admin@example.com / ChangeMe123!
