# Materials Ticketing System (Frontend Prototype)

This project is a rapid frontend prototype of the Materials Ticketing System, designed to replace a legacy Power Apps + SharePoint solution. It demonstrates the UI, user flows, and general structure of the application.

## Current State

Currently, this application is operating in **Mockup Mode**. 
- It uses in-memory mock data to drive the user interface.
- Navigation, layouts, routing, and styling are fully functional.
- The backend (`/server`, PostgreSQL, Prisma, authentication) has not yet been generated.

## Features Built

- **Authentication UI**: A clean login screen (bypasses real auth for prototyping).
- **Navigation**: Sidebar with routes for Dashboard, Inbound, Outbound, and Settings.
- **Dashboard**: High-level metrics and recent ticket activity.
- **Ticketing Queues**: Server-side styled filtering, searching, and status badge indicators.
- **Ticket Detail**: Complex form with editable fields, line item grid, assignment, and an integrated chat/activity feed.
- **Settings (Admin)**: User & Role management, and Reference Data tabs.

## Next Steps / Full-Stack Graduation

To make this a production-ready application with a real database and backend API:
1. **Database Setup**: We need to configure a PostgreSQL database and create the Prisma schema (`prisma/schema.prisma`) as defined in your requirements.
2. **Backend Services**: Implement the Express/Node.js backend in the `/server` directory to handle API routes, authentication, and database operations.
3. **Integration**: Replace the mock data in the frontend with React Query calls to the new backend API endpoints.

If you are ready to convert this prototype into a fully functional application, please let me know and we can upgrade this project to a full-stack environment!
