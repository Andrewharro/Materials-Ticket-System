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
- `client/src/App.tsx` — React Router with protected routes
- `client/src/lib/auth.ts` — Frontend auth helpers (token, apiFetch)
- `client/src/components/Sidebar.tsx` — Navigation sidebar
- `client/src/pages/` — Dashboard, InboundTickets, OutboundTickets, TicketDetail, SettingsUsers, SettingsReferenceData, Login

## Data Model
Tables: users, tickets, ticket_items, ticket_messages, subcontractors, departments, department_techs, ticket_statuses, app_settings, email_logs
Enums: user_role (USER/COORDINATOR/ADMIN), ticket_direction (INBOUND/OUTBOUND), ticket_status_key

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

## Default Login
- admin@example.com / ChangeMe123!
