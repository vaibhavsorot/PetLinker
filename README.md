# PetLinker — Backend Assignment Submission

Full-stack REST API with **JWT authentication**, **role-based access (user / staff)**, and **CRUD** on rescue reports. Includes a React UI for testing all flows.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Node.js, Express 5, PostgreSQL, JWT, bcrypt, express-validator, Swagger |
| Frontend | React 19, Vite, React Router |
| Docs | Swagger UI + Postman collection |

## Prerequisites

- Node.js installed
- PostgreSQL installed and running locally
- `psql` available in the terminal
- `createdb` available in the terminal

## Quick Start

### 1. Database setup

If PostgreSQL is not running, start it first.

Create the database and load schema:

```bash
createdb awo_db
psql -d awo_db -f server/src/sql/schema.sql
```

Seed the default staff account (optional but recommended for testing staff flows):

```bash
psql -d awo_db -f server/src/sql/seed_staff.sql
```

**Default staff login (if seeded)**
- Email: `vs@gmail.com`
- Password: `abc`
- Role: `staff`

**Regular users** must sign up via the frontend UI or `POST /api/v1/auth/signup`.

If you already have an existing `awo_db`, you can apply the auth fix only:

```bash
psql -d awo_db <<'SQL'
CREATE TABLE IF NOT EXISTS app_user (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

UPDATE app_user SET role = 'staff' WHERE role = 'admin';

ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('user', 'staff'));
SQL
```

### 2. Backend setup

```bash
cd server
cp .env.example .env
```

Then edit `server/.env` and set:

- `DATABASE_URL=postgresql://<db_user>:<db_password>@localhost:5432/awo_db`
- `JWT_SECRET=<your-secret-value>`

Install dependencies and start the backend:

```bash
npm install
npm run dev
```

Backend URLs:
- API base: http://localhost:5000/api/v1
- Health: http://localhost:5000/api/v1/health
- Swagger: http://localhost:5000/api/docs

### 3. Frontend setup

```bash
cd client
npm install
npm run dev
```

Open the frontend at http://localhost:5173

### 4. Evaluation notes

- The evaluator can clone the repo and follow these steps to run the app locally.
- PostgreSQL must be running and the schema loaded before the backend starts.
- If PostgreSQL is not available, the backend will not launch and the frontend cannot use the API.

## Assignment Checklist

| Requirement | Implementation |
|---|---|
| Register & login + bcrypt + JWT | `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` |
| Role-based access (user vs staff) | `requireStaff` middleware on staff routes |
| CRUD secondary entity | **Rescue reports** — full Create/Read/Update/Delete |
| API versioning | All routes under `/api/v1` |
| Validation & error handling | `express-validator` + global error handler |
| Swagger docs | http://localhost:5000/api/docs |
| Postman collection | `docs/PetLinker.postman_collection.json` |
| PostgreSQL schema | `server/src/sql/schema.sql` |
| React UI | Register, login, JWT portal, rescue CRUD |
| Security | helmet, input sanitization, parameterized SQL |

## API Overview (v1)

### Auth
| Method | Path | Access |
|---|---|---|
| POST | `/auth/signup` | Public (user or staff role) |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | JWT required |

### Rescues (CRUD entity)
| Method | Path | Access |
|---|---|---|
| POST | `/rescues` | User — create |
| GET | `/rescues/mine` | User — list own |
| GET | `/rescues/:id` | Owner or staff |
| PUT | `/rescues/:id` | Owner (pending) or staff |
| DELETE | `/rescues/:id` | Owner (pending) or staff |
| GET | `/rescues` | Staff — list all |
| PATCH | `/rescues/:id/status` | Staff |

### Staff-only routes
`/dashboard`, `/adoptions` (all), `/adoptions/:id/status`, `/donations` (all), `/medical`, `/staff`, `/licenses` (all)

## How to Verify

1. **Signup** → choose User or Staff role
2. **Login** → matching role (user / staff)
3. **User** → Report Rescue → create / edit / delete pending reports
4. **Staff** → Dashboard, all rescues, resolve, manage adoptions
5. **Swagger** → http://localhost:5000/api/docs
6. **Postman** → Import `docs/PetLinker.postman_collection.json`
7. **RBAC** → User token on `GET /api/v1/dashboard` → `403`
8. **JWT guard** → Clear `awo_token` → portal redirects to login

## Scalability Note

- **Load balancing**: Stateless JWT allows multiple API instances behind nginx/ALB.
- **Modular routes**: Each resource is a separate router — easy to split into microservices.
- **Database**: Connection pooling via `pg.Pool`; add read replicas and indexes at scale.
- **Caching**: Redis for frequent reads (shelters, animals) with TTL invalidation.
- **Async**: Status updates/notifications via message queue (RabbitMQ/SQS).
- **Deployment**: Docker + managed Postgres; structured logging and health checks for K8s/ECS.

## Project Structure

```
pets_react/
├── server/src/
│   ├── routes/          # REST modules
│   ├── middleware/      # JWT, RBAC, validation, errors
│   ├── validators/      # express-validator rules
│   ├── sql/             # schema + seeds
│   └── swagger.js       # OpenAPI spec
├── client/src/App.jsx   # React UI
├── docs/                # Postman collection
└── README.md
```
