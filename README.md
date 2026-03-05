# Materials OS — Ticketing System

A production-ready full-stack web application for managing inbound and outbound material tickets. Replaces a Microsoft Power Apps + SharePoint ticketing solution.

## Features

- **Ticketing**: Create, view, edit, and manage inbound/outbound material tickets
- **Line Items**: Editable item grid per ticket, saved transactionally with ticket data
- **Chat/Messaging**: In-ticket messaging with email notifications
- **RBAC**: Role-based access control (USER, COORDINATOR, ADMIN)
- **Search & Filter**: Server-side filtering, search, pagination across ticket queues
- **Admin Settings**: Manage users, roles, ticket statuses, departments, techs, subcontractors
- **Email Notifications**: Nodemailer with SMTP, logged to database

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: JWT (Bearer token)

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes (auto-set on Replit) |
| `JWT_SECRET` | Secret key for JWT signing | Recommended |
| `SMTP_HOST` | SMTP server hostname | No (emails logged if not set) |
| `SMTP_PORT` | SMTP port (default 587) | No |
| `SMTP_SECURE` | Use TLS (true/false) | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `SMTP_FROM` | Sender email address | No |
| `COORDINATOR_GROUP_EMAIL` | Fallback email for unassigned tickets | No |

## Setup

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server (seeds admin user + statuses automatically)
npm run dev
```

## Default Admin Login

- **Email**: admin@example.com
- **Password**: ChangeMe123!

## Production Build

```bash
npm run build
npm run start
```

## API Endpoints

### Auth
- `POST /api/auth/login` — Login with email/password, returns JWT
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user

### Tickets
- `GET /api/tickets` — List tickets (query: direction, status, search, page, pageSize)
- `GET /api/tickets/:id` — Get ticket with items and messages
- `POST /api/tickets` — Create new ticket
- `POST /api/tickets/:id/save` — Upsert ticket + items in one transaction
- `POST /api/tickets/:id/messages` — Post message + trigger email notification

### Admin (ADMIN role only)
- `GET/POST/PATCH /api/admin/users` — User management
- `GET/POST/PATCH/DELETE /api/admin/statuses` — Ticket status management
- `GET/POST/PATCH/DELETE /api/admin/departments` — Department management
- `GET/POST/PATCH/DELETE /api/admin/department-techs` — Department tech management
- `GET/POST/PATCH/DELETE /api/admin/subcontractors` — Subcontractor management
