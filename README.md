# Smart Campus Operations Hub

**IT3030 - Programming Applications and Frameworks (PAF 2026)**

A full-stack campus management platform for facilities, bookings, incident tickets, and notifications. Built with Spring Boot + React.

---

## Team & Module Ownership

| Member | Module | Endpoints | Members
|--------|--------|-----------|-----------|
| Member 1 (Leader) | Module A – Facilities & Assets Catalogue | `/api/resources/**` | Dasuni
| Member 2 | Module B – Booking Management | `/api/bookings/**` | Imalsha
| Member 3 | Module C – Maintenance & Incident Ticketing | `/api/tickets/**` | Ashinshani
| Member 4 | Module D – Notifications + Module E – Auth/OAuth | `/api/notifications/**`, `/api/auth/**` | Ush

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3.5, Spring Security, Spring Data JPA, Lombok |
| Frontend | React 19, Vite 8, TailwindCSS 3, shadcn/ui, React Router v7, TanStack React Query, Axios, Sonner |
| Database | PostgreSQL (Neon - cloud hosted) |
| Auth | Google OAuth 2.0 -> JWT token flow |
| CI/CD | GitHub Actions (`ci.yml`) |

---

## What's Already Built (Shared Infrastructure)

**You don't need to rebuild any of this. It's done and shared across all modules.**

### Backend (shared)
- **JPA Entities**: `User`, `Resource`, `Booking`, `Ticket`, `TicketAttachment`, `TicketComment`, `Notification`
- **Enums**: `UserRole`, `ResourceType`, `ResourceStatus`, `BookingStatus`, `TicketStatus`, `TicketPriority`, `NotificationType`
- **DTOs**: Request/response DTOs for all modules (`ResourceRequest`, `BookingRequest`, `TicketRequest`, etc.)
- **Repositories**: JPA repos for all entities with custom query methods
- **Exception Handling**: `GlobalExceptionHandler` with `ResourceNotFoundException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException` - returns consistent `ApiError` JSON
- **Security**: JWT auth filter, OAuth2 success handler, `CurrentUser` helper, `SecurityConfig` with CORS + stateless sessions
- **RBAC**: `@PreAuthorize("hasRole('ADMIN')")` on admin-only endpoints. Roles: `USER`, `ADMIN`, `TECHNICIAN`

### Frontend (shared)
- **UI Components** (`src/components/ui/`): shadcn components - Button, Input, Textarea, Label, Card, Badge, Select, Dialog, Avatar, Separator, DropdownMenu
- **Layout** (`src/components/layout/`): Sidebar, Topbar, DashboardLayout (with Outlet for nested routes)
- **Auth**: `AuthContext` with JWT token management, `ProtectedRoute` component
- **API Layer** (`src/api/`): Axios instance with JWT interceptor, endpoint functions for all modules
- **Routing**: React Router setup in `App.jsx` with protected routes

### Module A (complete - use as reference)
- Backend: `ResourceService`, `ResourceController` (full CRUD with filtering)
- Frontend: `ResourcesPage` (card grid, search, filters), `ResourceFormDialog` (create/edit modal)

---

## Project Structure

```
smart-campus/
├── .github/workflows/ci.yml        # CI: build + test on push/PR
├── backend/
│   ├── src/main/java/com/smartcampus/
│   │   ├── config/                  # SecurityConfig
│   │   ├── controller/              # REST controllers
│   │   │   ├── AuthController.java  # /api/auth/** (user CRUD + me)
│   │   │   └── ResourceController.java
│   │   ├── service/                 # Business logic
│   │   │   └── ResourceService.java
│   │   ├── repository/              # JPA repositories (all 7)
│   │   ├── model/                   # JPA entities + enums/
│   │   ├── dto/                     # Request/response DTOs (14 files)
│   │   ├── exception/               # Custom exceptions + GlobalExceptionHandler
│   │   └── security/                # JWT + OAuth2 handlers
│   ├── src/main/resources/
│   │   ├── application.yml          # Base config (loads .env)
│   │   ├── application-dev.yml      # Dev profile
│   │   └── application-prod.yml     # Prod profile (Render)
│   ├── .env.example                 # Template for secrets
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.js             # Axios instance + JWT interceptor
│   │   │   └── endpoints.js         # All API functions
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn components (11 files)
│   │   │   ├── layout/              # Sidebar, Topbar, DashboardLayout
│   │   │   └── common/              # ProtectedRoute
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── OAuthCallback.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── BookingsPage.jsx     # Placeholder - Member 2 builds this
│   │   │   ├── TicketsPage.jsx      # Placeholder - Member 3 builds this
│   │   │   ├── NotificationsPage.jsx # Placeholder - Member 4 builds this
│   │   │   ├── UserManagementPage.jsx
│   │   │   └── resources/           # Module A pages (reference)
│   │   ├── App.jsx                  # Routes
│   │   ├── main.jsx                 # Providers (Router, Query, Auth, Toaster)
│   │   └── index.css                # Tailwind + shadcn CSS variables
│   ├── package.json
│   ├── vite.config.js               # @ path alias
│   └── tailwind.config.js           # shadcn theme
└── README.md
```

---

## Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- Maven 3.8+ (or use the included `mvnw` wrapper)
- Google OAuth credentials (shared in group chat)

### 1. Clone and checkout your branch
```bash
git clone https://github.com/DasuniSamaraweera/smart-cm.git
cd smart-cm
git checkout feature/module-b-bookings    # replace with your branch
git merge develop                         # get latest shared code
```

### 2. Setup backend secrets
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with the shared credentials:
```
DB_URL=jdbc:postgresql://...          # Neon connection string (in group chat)
DB_USERNAME=...
DB_PASSWORD=...
GOOGLE_CLIENT_ID=...                  # Google OAuth (in group chat)
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...                        # Any long random string
```

**Never commit `.env` - it's in `.gitignore`.**

### 3. Run backend
```bash
cd backend
./mvnw spring-boot:run '-Dspring-boot.run.profiles=dev'
```
> Windows PowerShell needs quotes around `-D` flag. On Linux/Mac it works without quotes.

Backend runs at **http://localhost:8080**

### 4. Run frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at **http://localhost:5173**

### 5. Test the app
1. Open http://localhost:5173
2. Click "Sign in with Google"
3. After login you land on the Dashboard
4. Navigate using the sidebar

**First user to sign in becomes ADMIN automatically.** Everyone after gets USER role. Admins can promote others from User Management.

---

## How to Build Your Module

### Backend (your Service + Controller)

1. **Service**: Create `src/main/java/com/smartcampus/service/YourService.java`
   - Inject the repository (already created)
   - Write business logic methods
   - Use the existing DTOs for request/response mapping
   - See `ResourceService.java` as reference

2. **Controller**: Create `src/main/java/com/smartcampus/controller/YourController.java`
   - Use `@RestController` + `@RequestMapping("/api/your-module")`
   - Add `@PreAuthorize("hasRole('ADMIN')")` on admin-only endpoints
   - Use `@Valid @RequestBody YourRequest` for validation
   - Return `ResponseEntity<YourResponse>`
   - See `ResourceController.java` as reference

3. **Get current user**: Inject `CurrentUser currentUser` and call `currentUser.get()` to get the logged-in `User` entity.

4. **Throw errors**: Use the existing exception classes:
   ```java
   throw new ResourceNotFoundException("Booking", id);
   throw new BadRequestException("Time slot conflict");
   throw new ForbiddenException("Only admins can do this");
   ```

### Frontend (your Page)

1. **API functions are ready** in `src/api/endpoints.js` - your module's functions are already defined.

2. **Create your page** in `src/pages/YourPage.jsx`:
   - Use `useQuery` / `useMutation` from TanStack React Query
   - Use shadcn components from `@/components/ui/`
   - Use `toast` from `sonner` for notifications
   - Use `useAuth()` to check `isAdmin` for conditional UI
   - See `pages/resources/ResourcesPage.jsx` as reference

3. **Route is already set up** in `App.jsx` - your placeholder page just needs to be replaced with real content.

4. **Import pattern**:
   ```jsx
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
   import { bookingApi } from '@/api/endpoints'
   import { toast } from 'sonner'
   import { Button } from '@/components/ui/button'
   import { Card, CardContent } from '@/components/ui/card'
   ```

---

## API Endpoints

| Method | Endpoint | Description | Auth | Member |
|--------|----------|-------------|------|--------|
| **Auth** |
| GET | `/api/auth/me` | Current user profile | JWT | Shared |
| GET | `/api/auth/users` | List all users | ADMIN | Shared |
| PUT | `/api/auth/users/{id}` | Update user details | ADMIN | Shared |
| PUT | `/api/auth/users/{id}/role?role=ADMIN` | Change user role | ADMIN | Shared |
| DELETE | `/api/auth/users/{id}` | Delete user | ADMIN | Shared |
| **Module A - Resources** |
| GET | `/api/resources?type=LAB&status=ACTIVE&search=room` | List/filter resources | JWT | M1 |
| GET | `/api/resources/{id}` | Get single resource | JWT | M1 |
| POST | `/api/resources` | Create resource | ADMIN | M1 |
| PUT | `/api/resources/{id}` | Update resource | ADMIN | M1 |
| DELETE | `/api/resources/{id}` | Delete resource | ADMIN | M1 |
| **Module B - Bookings** |
| GET | `/api/bookings` | List bookings | JWT | M2 |
| POST | `/api/bookings` | Create booking | JWT | M2 |
| PUT | `/api/bookings/{id}/status` | Approve/reject booking | ADMIN | M2 |
| DELETE | `/api/bookings/{id}` | Cancel booking | JWT | M2 |
| **Module C - Tickets** |
| GET | `/api/tickets` | List tickets | JWT | M3 |
| POST | `/api/tickets` | Create ticket (multipart) | JWT | M3 |
| PUT | `/api/tickets/{id}/status` | Update ticket status | JWT | M3 |
| DELETE | `/api/tickets/{id}` | Delete ticket | ADMIN | M3 |
| **Module D - Notifications** |
| GET | `/api/notifications` | Get user notifications | JWT | M4 |
| GET | `/api/notifications/unread/count` | Unread count | JWT | M4 |
| PUT | `/api/notifications/{id}/read` | Mark as read | JWT | M4 |
| DELETE | `/api/notifications/{id}` | Delete notification | JWT | M4 |

---

## Branching Strategy

```
main
  └── develop          # integration branch
        ├── feature/module-a-facilities   (Member 1)
        ├── feature/module-b-bookings     (Member 2)
        ├── feature/module-c-incidents    (Member 3)
        └── feature/module-d-auth         (Member 4)
```

**Rules:**
- Never commit directly to `main` or `develop`
- Always merge `develop` into your branch before starting work: `git merge develop`
- PRs require at least 1 review before merging into `develop`
- Use meaningful commit messages: `feat: add booking conflict detection`

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Backend | Render | TBD |
| Frontend | Vercel | TBD |
| Database | Neon PostgreSQL | (configured) |

---

## Key Files to Know

| File | What it does |
|------|-------------|
| `backend/.env` | Your local secrets (DB, OAuth, JWT) |
| `backend/src/.../SecurityConfig.java` | CORS, JWT filter, OAuth2 setup |
| `backend/src/.../GlobalExceptionHandler.java` | All error responses |
| `frontend/src/api/endpoints.js` | All API call functions |
| `frontend/src/context/AuthContext.jsx` | Login state, JWT token, `useAuth()` hook |
| `frontend/src/App.jsx` | All routes |
| `frontend/src/main.jsx` | App providers (Router, QueryClient, Auth, Toaster) |
| `frontend/src/index.css` | Theme colors (CSS variables) |

---

## Recent Changes (April 2026)

### Module A - Resources and Dashboard UX
- Added smart ranking emphasis in the resource catalog: the top-ranked item in Best Fit mode is now visually highlighted as the best match.
- Improved resource filter clarity with labeled date/time fields and a readable selected date/time summary panel.
- Improved resource card readability by adding a dedicated availability block with clear date and time formatting.
- Updated sidebar theme to a white background with adjusted navigation contrast for better readability.

### Facilities Assistant
- Added voice input support in the Facilities Assistant chat box using browser speech recognition.
- Included microphone start/stop controls, listening state feedback, and permission/error fallback messaging.

### Booking and Analytics Updates
- Added booking management improvements including upcoming/past views and clearer booking duration display.
- Added admin booking analytics enhancements with top resource usage insights and peak-hour visibility.

### Ticketing Updates
- Added technician ticket analysis page and follow-up ticketing refinements.

### Notes
- Resource availability calendar on the dashboard consumes the shared resources query and reflects newly added active resources based on their configured availability date.



