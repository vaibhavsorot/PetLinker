# PetLinker (Animal Welfare Organization) - Technical Overview

## Project Description
PetLinker is a full-stack web application designed for managing animal welfare operations, including shelter management, pet adoptions, rescue reporting, donations, and medical records. It provides separate portals for regular users and staff members with role-based access control.

---

## Architecture Overview

### Tech Stack
**Frontend:**
- React 19.2.4 with Hooks
- React Router DOM v7.14 (client-side routing)
- Vite (build tool and dev server)
- ES6+ modules
- CSS for styling

**Backend:**
- Node.js with Express 5.2
- PostgreSQL relational database
- JWT (JSON Web Tokens) for authentication
- bcryptjs for password hashing
- CORS for cross-origin requests
- dotenv for environment variable management

**Development Tools:**
- ESLint for code quality
- Nodemon for development hot-reload
- Vite for optimized bundling

### Architecture Pattern
**Client-Server Architecture with REST API**
- Frontend: Single Page Application (SPA) running on Vite dev server (port 5173)
- Backend: RESTful API server running on Express (port 5000)
- Database: PostgreSQL connection pool
- Communication: JSON over HTTP with Bearer token authentication

---

## Core Features & Concepts

### 1. **Authentication System**

#### Signup Flow
- **Endpoint:** `POST /api/auth/signup`
- **Concepts Used:**
  - Password hashing with bcryptjs (10 salt rounds)
  - Email uniqueness validation (database constraint)
  - Role-based user registration (user/staff roles)
  - Input validation and error handling
  - SQL prepared statements (parameterized queries)

#### Login Flow
- **Endpoint:** `POST /api/auth/login`
- **Concepts Used:**
  - Credential validation
  - bcrypt password comparison
  - JWT token generation with 1-day expiry
  - Role-based authentication
  - Bearer token in Authorization header

#### Current User
- **Endpoint:** `GET /api/auth/me`
- **Concepts Used:**
  - Token verification middleware
  - Protected route pattern
  - User context maintenance

**Frontend Auth Patterns:**
- Context API alternative: `useMemo` hook for auth object memoization
- localStorage for token persistence
- Session state management with React hooks
- Automatic redirect based on authentication status
- ProtectedRoute component for route-level protection

**Key Concepts:**
- Stateless authentication with JWT
- Token-based authorization
- Password security with bcrypt hashing
- Role-based access control (RBAC)
- HTTP-only storage considerations (localStorage currently used)

---

### 2. **Authorization & Middleware**

#### JWT Verification Middleware
- **Function:** `verifyToken(req, res, next)`
- **Concepts Used:**
  - Middleware pattern
  - Bearer token extraction from Authorization header
  - JWT signature verification
  - Error handling with 401 status codes
  - Token expiry checking
  - Custom request property injection (`req.user`)

**Routes Protected:**
- All data endpoints require valid JWT token
- Token decoded to extract `id`, `email`, `role`, `name`
- Used for user context in operations like adoption requests, donations

---

### 3. **Animal Management System**

#### Features:
- **GET /api/animals** - Retrieve all animals or filter by shelter
- **GET /api/animals?shelterId={id}** - Shelter-specific animals

**Concepts Used:**
- Query parameter handling for filtering
- LEFT JOIN in SQL (handle animals without assigned shelters)
- COALESCE function (default values for NULL fields)
- Parameterized queries for SQL injection prevention
- Conditional query construction based on parameters

**Database Relations:**
```
Animal ←→ Shelter (Many-to-One)
Animal ←→ Adoption (One-to-Many)
Animal ←→ Medical Record (One-to-Many)
Animal ←→ License (One-to-Many)
```

**Data Retrieved:**
- Animal ID, Name, Species, Status, Assigned Shelter
- Status values: Available, Adopted, Under Medical Care

---

### 4. **Adoption Management System**

#### User Features:
- Browse animals by shelter
- Submit adoption requests
- View personal adoptions
- Track adoption status

#### Staff Features:
- View all pending adoption requests
- Approve/Reject adoption requests
- View adoption history

#### Endpoints:
- `GET /api/adoptions` - All adoptions (staff only)
- `GET /api/adoptions/mine` - User's adoptions
- `POST /api/adoptions/request` - Submit adoption request
- `PATCH /api/adoptions/{id}/status` - Update status (staff only)

**Key Concepts:**
- Many-to-Many relationship modeling (Animal ↔ Adopter through Adoption table)
- Status state machine: Pending → (Approved/Rejected)
- Query filtering by user identity
- User-data isolation (user can only see their own requests)
- Transactional operations (create adopter and adoption record)
- Filter logic in frontend (pending vs history)

**Validation:**
- Animal ID type conversion (Number validation)
- Status enum validation (only Approved/Rejected)
- Database constraints (foreign keys, check constraints)

---

### 5. **Rescue Report Management**

#### Features:
- Users submit rescue reports
- Staff can view and update status
- Track by urgency level
- Location-based organization

#### Endpoints:
- `GET /api/rescues` - All rescue reports (staff)
- `GET /api/rescues/mine` - User's reports
- `POST /api/rescues` - Submit new report
- `PATCH /api/rescues/{id}/status` - Update status to Resolved

**Concepts Used:**
- Enum validation (Low, Medium, High urgency)
- Status workflow (Pending → Ongoing → Resolved)
- Optional field handling (description is optional)
- Timestamp management (CURRENT_DATE in SQL)
- Case-insensitive user matching
- User-scoped data queries

---

### 6. **Donation System**

#### Features:
- Users make donations to shelters
- Track donation amount and date
- View all donations or personal donations
- Dashboard shows monthly donation totals

#### Endpoints:
- `GET /api/donations` - All donations
- `GET /api/donations/mine` - User's donations
- `POST /api/donations` - Create new donation

**Key Concepts:**
- Numeric validation (amount > 0)
- Currency handling (numeric(10,2) for precision)
- Date aggregation (date_trunc for monthly totals)
- COALESCE with SUM for zero defaults
- Foreign key constraint (shelterId must exist)
- Data formatting (TO_CHAR for date formatting)

**Dashboard Stats:**
```sql
SELECT COALESCE(SUM(amount), 0)::numeric(10,2) AS total
FROM donation
WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
```

---

### 7. **Dashboard Analytics**

#### Metrics:
- Count of animals in shelters
- Pending adoptions count
- Active rescue reports (Pending/Ongoing)
- Monthly donations total

#### Implementation:
- `Promise.all()` for parallel database queries
- Concurrent query optimization
- Aggregation functions (COUNT, SUM)
- Conditional status filtering

**Concepts:**
- Async operations orchestration
- Performance optimization (parallel queries)
- Data aggregation at database layer
- Real-time statistics calculation

---

### 8. **Shelter Management**

#### Features:
- List all shelters with details
- Track capacity and occupancy
- Location information

#### Endpoint:
- `GET /api/shelters` - All shelters with stats

**SQL Concepts:**
- GROUP BY aggregation
- LEFT JOIN with COUNT
- Derived column calculations (occupancy = COUNT(animals))
- Shelter-Animal relationship (One-to-Many)

---

### 9. **Medical Records System**

#### Features:
- Track animal medical history
- Vaccination dates
- Next checkup schedule
- Assigned veterinarian

#### Endpoint:
- `GET /api/medical` - All medical records

**Database Relations:**
```
Medical Record ←→ Animal (Many-to-One)
Medical Record ←→ Veterinarian (Many-to-One)
```

**Data Transformations:**
- TO_CHAR for date formatting
- COALESCE for handling NULL veterinarians

---

### 10. **License Management System**

#### Features:
- Pet ownership licenses
- Issue and expiry date tracking
- Automatic expiry status detection
- User-specific license queries

#### Endpoints:
- `GET /api/licenses` - All licenses
- `GET /api/licenses/mine` - User's licenses

**Key Concepts:**
- Date comparison for expiry logic:
  ```sql
  CASE
    WHEN l.expirydate < CURRENT_DATE THEN 'Expired'
    ELSE l.status
  END
  ```
- Business logic in SQL vs application layer
- Conditional status computation

---

### 11. **Staff Management**

#### Features:
- View staff members
- Track assigned shelter
- Staff contact information

#### Endpoint:
- `GET /api/staff` - All staff

**Database Relations:**
```
Staff Member ←→ Shelter (Many-to-One)
```

---

## Database Design Patterns

### Schema Design Concepts
1. **Primary Keys:** Auto-increment SERIAL type
2. **Constraints:** 
   - UNIQUE on email
   - CHECK constraints on enums (role, urgency)
   - Foreign key constraints for referential integrity
3. **Default Values:** TIMESTAMP DEFAULT NOW()
4. **Type Safety:** VARCHAR for text, NUMERIC for currency, SERIAL for IDs
5. **Naming:** Snake_case for database columns, camelCase for API responses

### Common SQL Patterns
- **LEFT JOIN:** Graceful handling of missing related records
- **COALESCE:** Providing default values for NULL
- **GROUP BY + COUNT:** Aggregation for statistics
- **date_trunc:** Date-based grouping for time-series data
- **WHERE clauses:** User-scoped data filtering
- **CASE statements:** Conditional logic in queries
- **Parameterized queries:** SQL injection prevention
- **Type casting:** ::int, ::numeric(10,2) for data type conversion

---

## Frontend Architecture

### State Management Patterns

#### 1. Local Component State
```javascript
const [session, setSession] = useState(() => {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
})
```
- Initial state from localStorage
- Session persistence across page reloads

#### 2. useMemo for Auth Context
```javascript
const auth = useMemo(() => ({
  session,
  login: ({ email, role, name }) => {...},
  signup: async ({ name, email, password, role }) => {...},
  validateLogin: async ({ email, password, role }) => {...},
  logout: () => {...},
}), [navigate, session])
```
- Memoized to prevent unnecessary re-renders
- Auth object dependency for navigation

#### 3. Custom Hook Pattern
```javascript
function useProtectedList(endpoint, key) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Fetch logic...
  return { items, loading, error }
}
```
- Reusable data-fetching logic
- Consistent loading/error states
- Encapsulation of API calls

### Component Hierarchy
```
App
├── LoginPage / SignupPage
└── ProtectedRoute
    └── PortalRouter
        ├── StaffPortal (if role === 'staff')
        │   ├── Dashboard
        │   ├── Animals
        │   ├── Adoptions (with canManage=true)
        │   ├── Rescues (with canManage=true)
        │   ├── Medical
        │   ├── Shelters
        │   ├── Staff
        │   ├── Licenses
        │   └── Donations
        └── UserPortal (if role === 'user')
            ├── Browse Animals
            ├── My Adoptions
            ├── Report Rescue
            └── Pet Licenses
```

### React Router Concepts
- **Nested routing:** Portals contain sub-routes
- **Protected routes:** Authentication check before rendering
- **Conditional rendering:** Role-based portal selection
- **Navigation:** `useNavigate` hook for programmatic routing
- **NavLink:** Active link highlighting
- **Navigate component:** Automatic redirects

### Form Handling
- Controlled inputs with `useState`
- Form submission handlers with async/await
- Error and success message display
- Token-based API authorization

### Data Fetching Patterns
- Fetch API with Bearer token
- Error handling and user feedback
- Loading states during requests
- Optional request parameters (shelterId)

---

## Security Concepts

### Authentication
1. **Password Security:**
   - bcryptjs hashing (10 salt rounds)
   - Never store plain passwords
   - Comparison with bcrypt.compare()

2. **JWT Tokens:**
   - Bearer token scheme
   - 1-day expiry
   - Signed with secret key
   - Extracted from Authorization header

3. **Token Storage:**
   - Currently: localStorage
   - Potential improvement: httpOnly cookies

### Authorization
1. **Route-level Protection:**
   - ProtectedRoute component checks session
   - Redirects to login if not authenticated

2. **Role-Based Access:**
   - Role check in PortalRouter (staff vs user)
   - Different UI for different roles
   - Backend enforces permissions indirectly (staff can access management endpoints)

3. **User-Scoped Data:**
   - Adoption requests filtered by user name
   - Donations filtered by user name
   - Rescue reports filtered by user name

### Data Protection
1. **SQL Injection Prevention:**
   - Parameterized queries ($1, $2 in pg library)
   - No string concatenation in SQL

2. **Input Validation:**
   - Type conversion (Number())
   - Enum validation (role, urgency, status)
   - Non-null checks
   - Range checks (amount > 0)

---

## API Design Patterns

### RESTful Conventions
- **Resource-based URLs:** `/api/animals`, `/api/adoptions`
- **HTTP Methods:**
  - GET: Retrieve resources
  - POST: Create resources
  - PATCH: Partial updates
- **Status Codes:**
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 404: Not Found
  - 409: Conflict (email exists)
  - 500: Server Error

### Error Handling
- Consistent error response format: `{ message, error }`
- Try-catch blocks for async operations
- Specific error messages for debugging
- Error propagation to frontend

### API Response Format
```json
{
  "animals": [...],
  "adoptions": [...],
  "stats": {...},
  "token": "...",
  "user": {...},
  "message": "...",
  "error": "..."
}
```

---

## Performance Optimizations

### Backend
1. **Parallel Queries:** Dashboard fetches 4 metrics concurrently
2. **Query Optimization:** Only required columns selected
3. **Connection Pooling:** PostgreSQL pool for connection reuse

### Frontend
1. **Code Splitting:** Vite automatically optimizes
2. **Memoization:** useMemo for auth object
3. **Lazy Loading:** Routes loaded on demand

---

## Scalability Considerations

### Database
- Index on frequently queried columns (email, role, dates)
- Connection pooling prevents connection exhaustion
- Parameterized queries prevent N+1 problems (somewhat - aggregations used)

### API
- Modular route structure (separate files per resource)
- Middleware pattern for cross-cutting concerns (auth)
- Environment-based configuration (dotenv)

### Frontend
- Component-based architecture for reusability
- Custom hooks for logic extraction
- CSS organization for maintainability

---

## Development Workflow

### Setup
```bash
# Server
cd server
npm install
npm run dev

# Client (separate terminal)
cd client
npm run dev
```

### Environment Configuration
- **Server:** `.env` file with DATABASE_URL, JWT_SECRET, PORT, CLIENT_ORIGIN
- **Client:** API_BASE hardcoded (should use .env)

### Build
- Client: `npm run build` (Vite production build)
- Server: No build step (ES modules run directly)

---

## Testing Strategies (Not Implemented)

### Unit Tests
- Authentication functions (bcrypt, JWT)
- Validation functions
- Hook logic

### Integration Tests
- API endpoint tests
- Database queries
- Authentication flow

### E2E Tests
- User registration and login
- Adoption request workflow
- Dashboard data display

---

## Interview-Relevant Concepts

### Backend Concepts
1. **Express.js:** Middleware, routing, error handling
2. **PostgreSQL:** Joins, aggregations, constraints, transactions
3. **Authentication:** JWT, bcrypt, token validation
4. **API Design:** RESTful conventions, status codes, error handling
5. **Database Design:** Relationships, normalization, indexes
6. **Node.js:** Event-driven architecture, async/await, callbacks
7. **Security:** SQL injection prevention, password hashing, authorization

### Frontend Concepts
1. **React Hooks:** useState, useEffect, useMemo, useCallback
2. **React Router:** Routing, nested routes, navigation
3. **State Management:** Context API, local state, custom hooks
4. **Async Operations:** Fetch API, promises, async/await
5. **Form Handling:** Controlled components, validation
6. **Component Architecture:** Composition, reusability, hierarchy
7. **Performance:** Memoization, code splitting, lazy loading

### Full-Stack Concepts
1. **Authentication Flow:** Sign-up, Login, Token management
2. **Authorization:** Role-based access control
3. **Error Handling:** Consistent error formats, user feedback
4. **Data Validation:** Input validation, type safety
5. **Security:** XSS prevention, CSRF, secure headers
6. **Scalability:** Connection pooling, query optimization, caching
7. **Deployment:** Environment variables, health checks, logging

### Design Patterns
1. **Middleware Pattern:** Auth verification
2. **Custom Hooks:** Reusable logic extraction
3. **Protected Route Pattern:** Authentication guards
4. **Query Parameter Filtering:** Dynamic API calls
5. **Error Boundary:** Try-catch blocks
6. **Composition:** Component reusability through props

---

## Key Technical Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| JWT + Bearer tokens | Stateless authentication, scalable | Token revocation complexity |
| localStorage | Persistence across sessions | Vulnerable to XSS (should use httpOnly) |
| pg library | Native PostgreSQL support | Lower-level API |
| React Hooks | Modern, functional approach | Learning curve |
| CSS (no framework) | Lightweight | Responsive design requires manual work |
| Vite | Fast dev server, modern build | Less documentation than Webpack |
| Parameterized queries | SQL injection prevention | Slightly more verbose |

---

## Potential Improvements

1. **Security:**
   - Use httpOnly cookies for token storage
   - Add CSRF protection
   - Implement rate limiting
   - Add input sanitization

2. **Performance:**
   - Add Redis caching for frequent queries
   - Implement pagination for large datasets
   - Add database indexes
   - Use connection pooling on client

3. **Architecture:**
   - Implement error boundary in React
   - Add logging/monitoring
   - Use TypeScript for type safety
   - Add API versioning

4. **Testing:**
   - Unit tests for business logic
   - Integration tests for API
   - E2E tests for user workflows

5. **Frontend:**
   - Implement state management library (Redux/Zustand)
   - Add loading skeletons
   - Implement infinite scroll
   - Add form validation library

6. **Backend:**
   - Add API documentation (Swagger/OpenAPI)
   - Implement middleware for logging
   - Add request validation middleware
   - Implement soft deletes for data retention

---

## Database Schema Overview

```
app_user
├── id (PK)
├── name
├── email (UNIQUE)
├── password_hash
├── role (user/staff)
└── created_at

animal
├── animalid (PK)
├── name
├── species
├── status
├── shelterid (FK)

shelter
├── shelterid (PK)
├── name
├── location
├── capacity
└── occupancy (calculated)

adoption
├── adoptionid (PK)
├── animalid (FK)
├── adopterid (FK)
├── adoptiondate
└── status (Pending/Approved/Rejected)

adopter
├── adopterid (PK)
└── name

rescuereport
├── reportid (PK)
├── reportername
├── location
├── description
├── urgency (Low/Medium/High)
└── status (Pending/Ongoing/Resolved)

donation
├── donationid (PK)
├── donorname
├── amount
├── date
└── shelterid (FK)

medicalrecord
├── recordid (PK)
├── animalid (FK)
├── treatment
├── vaccinationdate
├── nextcheckupdate
└── vetid (FK)

veterinarian
├── vetid (PK)
└── name

license
├── licenseid (PK)
├── ownername
├── animalid (FK)
├── issuedate
├── expirydate
└── status

staffmember
├── staffid (PK)
├── name
├── role
├── contactinfo
└── assignedshelterid (FK)
```

