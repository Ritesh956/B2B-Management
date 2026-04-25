# Vendor Platform

A role-based vendor management platform with modules for vendor onboarding, purchase order approvals, invoice workflows, contracts, notifications, audit logs, and role-specific dashboards.

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind + Recharts
- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL
- Queue/Cache: Redis + Bull
- File Storage: AWS S3 (PDF/doc uploads)
- PDF Rendering: Puppeteer (PO PDF generation)
- Scheduling: node-cron
- Email: Nodemailer

## Monorepo Structure

- `client/`: Frontend app
- `server/`: Backend API and workers
- `docker-compose.yml`: Full local stack (postgres, redis, server, client)

## Local Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create/update `server/.env` and (optionally) `client/.env`.

### 3. Run backend

```bash
cd server
npm run dev
```

### 4. Run frontend

```bash
cd client
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

### 5. Build verification

```bash
cd server
npm run build

cd ../client
npm run build
```

## Docker Setup

Run all services in one command:

```bash
docker-compose up --build
```

Services started:

- postgres (5432)
- redis (6379)
- server (5000)
- client (5173)

Each service has health checks in `docker-compose.yml`.

## Environment Variables

### Server (`server/.env`)

- `PORT`: API port (default `5000`)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `AWS_ACCESS_KEY_ID`: S3 access key
- `AWS_SECRET_ACCESS_KEY`: S3 secret key
- `AWS_REGION`: S3 region
- `AWS_S3_BUCKET`: S3 bucket name
- `SMTP_HOST`: SMTP host
- `SMTP_PORT`: SMTP port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `EMAIL_FROM`: Sender email address

### Client (`client/.env`)

- `VITE_API_URL`: API base URL (example: `http://localhost:5000/api`)

## API Endpoints (Grouped by Module)

Base URL: `/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Dashboard

- `GET /dashboard/stats`

### Vendor Management

- `POST /vendors`
- `GET /vendors`
- `GET /vendors/:id`
- `PATCH /vendors/:id/status`

### Purchase Orders

- `POST /pos`
- `GET /pos`
- `GET /pos/:id`
- `GET /pos/:id/pdf`
- `POST /pos/:id/approve`
- `POST /pos/:id/reject`

### Invoices

- `POST /invoices`
- `GET /invoices`
- `GET /invoices/:id`
- `PATCH /invoices/:id/approve`
- `PATCH /invoices/:id/pay`

### Contracts

- `POST /contracts`
- `GET /contracts`
- `GET /contracts/:id`
- `PATCH /contracts/:id`

### Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`

### Audit Logs (Admin)

- `GET /audit-logs`

### Vendor Portal (Vendor role only)

- `GET /vendor/dashboard`
- `GET /vendor/profile`
- `PATCH /vendor/profile`

## Frontend Routes

### Core App

- `/dashboard`
- `/vendors`
- `/vendors/:id`
- `/pos`
- `/pos/:id`
- `/invoices`
- `/invoices/:id`
- `/contracts`
- `/contracts/:id`
- `/audit-logs`

### Vendor Portal

- `/vendor/dashboard`
- `/vendor/invoices/new`
- `/vendor/profile`

## Background Jobs

- `emailQueue`: sends async emails via SMTP
- `notificationQueue`: creates in-app notifications in DB
- Contract expiry cron: daily at 9:00 AM, queues email/notification alerts

## Notes

- Invoice submission is restricted to approved POs for vendor users.
- PO PDF export is available at `GET /api/pos/:id/pdf`.
- Audit logs are written for mutations across vendors, POs, invoices, contracts, and vendor profile updates.
