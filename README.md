# VendorHub

VendorHub is a robust, scalable B2B vendor management platform designed for complete vendor lifecycle operations. It securely streamlines purchasing, invoice processing, contract compliance, and comprehensive reporting across various enterprise roles including Admins, Finance, Procurement, Managers, and Vendors. 

## Features
- **Role-Based Access Control**: Strict permissions model via JWT and robust backend authorization.
- **Vendor Portal**: An isolated, secure dashboard for vendors to manage their profile, POs, and invoices.
- **Purchase & Invoices**: Full PO matching, soft-delete audits, and bulk approval actions for finance teams.
- **Notifications**: In-app notification bell backed by polling; the server's Socket.io layer (JWT-authenticated, per-user rooms) is built for real-time push but not yet wired up client-side.
- **Performance & Reports**: Graphical breakdowns using Recharts and headless browser PDF exports (Puppeteer).
- **Hardened API**: Rate-limited, versioned (`/api/v1`), and validated environment startup logic.
- **Resilient Infrastructure**: Soft deletes via Prisma, automated background queues (Bull/Redis), and scheduled cron jobs.

## Tech Stack
| Layer           | Technologies                                                                 |
|-----------------|------------------------------------------------------------------------------|
| **Frontend**    | React, TypeScript, Zustand, Recharts; theming via CSS custom properties (`.light`/`.dark` class toggle), not Tailwind utility classes |
| **Backend**     | Node.js, Express, Prisma ORM, Socket.io, Bull (Redis), Puppeteer, Zod         |
| **Database**    | PostgreSQL 15, Redis 7                                                       |
| **DevOps**      | Docker, Docker Compose, Nginx, GitHub Actions (CI)                            |

## Prerequisites
- Node.js (v20)
- Docker & Docker Compose
- PostgreSQL (if running bare-metal)

## Local Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd vendor-platform
   ```

2. **Environment Configuration**:
   Create `.env` files in both the `server` and `client` directories. Follow the examples in the `.env.example` placeholders.

3. **Install Dependencies**:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

4. **Initialize Database**:
   Ensure Docker is running, then spin up the database and apply the schema:
   ```bash
   cd server
   docker run --name vendordb -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres
   npx prisma migrate dev
   ```

5. **Start Development Servers**:
   You can start both client and server manually:
   ```bash
   cd server && npm run dev
   cd ../client && npm run dev
   ```
   Or use the provided Docker Compose override:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.override.yml up
   ```

   On Windows without Docker, `start-local.ps1` at the repo root automates the whole thing: it boots a local PostgreSQL 17 instance on port 5433, creates the `vendordb` database if needed, and starts both the server (`:5000`) and client (`:5173`). Run it from the repo root:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start-local.ps1
   ```
   Demo login: `admin@demo.com` / `Admin123` (see `server/prisma/seed.ts` for one demo account per role).

## Environment Variables
### Server
| Name | Description | Example |
|------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secure cryptographic secret | `super_secret_string` |
| `AWS_REGION` | S3 Region for uploads | `us-east-1` |
| `SMTP_HOST` | Email Provider Host | `smtp.gmail.com` |

### Client
| Name | Description | Example |
|------|-------------|---------|
| `VITE_API_URL` | Backend URL | `http://localhost:5000/api/v1` |

## API Endpoints (v1)

| Module        | Method | Path | Auth | Description |
|---------------|--------|------|------|-------------|
| **Auth**      | POST | `/api/v1/auth/login` | Public | Authenticate a user |
| **Health**    | GET | `/api/v1/health` | Public | Check DB/Redis status |
| **Admin**     | GET | `/api/v1/admin/deleted-items` | ADMIN | Fetch all soft-deleted records |
| **Admin**     | PATCH | `/api/v1/admin/restore` | ADMIN | Restore a soft-deleted record |
| **Vendors**   | POST | `/api/v1/vendors` | PROCUREMENT | Create a vendor |
| **Vendors**   | GET | `/api/v1/vendors/export` | FINANCE | Export vendors to CSV |
| **Invoices**  | PATCH| `/api/v1/invoices/bulk` | FINANCE | Approve multiple matched invoices |
| **Reports**   | GET | `/api/v1/reports/export/monthly-pdf` | FINANCE | Generate monthly PDF report |
| **Vendor Port**| GET | `/api/v1/vendor/dashboard` | VENDOR | Fetch vendor-specific metrics |

## Roles & Permissions Matrix
| Role | Capabilities |
|------|--------------|
| **ADMIN** | Full system access. Bulk updates, soft-delete restoration, system settings. |
| **FINANCE** | Approve invoices, bulk approve, access financial reporting and PDF exports. |
| **PROCUREMENT** | Onboard vendors, manage contracts, issue purchase orders. |
| **MANAGER** | General oversight, analytics viewing, vendor scoring. |
| **VENDOR** | Isolated portal access. View their POs/contracts, submit invoices, update profile. |

## Deployment

The live app deploys to managed platforms, not the VPS path below: **client** on Vercel (https://rit-vendor.vercel.app, `npx vercel --prod` from `client/`), **server** on Render via the Blueprint at `render.yaml` (https://vendorhub-server.onrender.com, auto-deploys on push to `main`). See `CLAUDE.md` for the full deployment/architecture notes.

### Self-hosted alternative (Ubuntu VPS via Docker)
1. Provision a Ubuntu VPS and install Docker & Docker Compose.
2. Clone the repository to your server.
3. Add a `.env.production` file inside the `server/` directory with production secrets.
4. Build and start the production cluster:
   ```bash
   docker-compose build
   docker-compose up -d
   ```
5. Ensure firewall rules allow port `80` and `443` for the Nginx proxy container.

---
*VendorHub - Finalizing enterprise procurement for the modern web.*
