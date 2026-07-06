# TimeKeep — Employee Attendance Management System

A full-stack attendance tracker with clock in/out, daily/weekly/monthly
reports, late & overtime tracking, and admin vs employee roles.

**Stack:** React (Vite) · Node.js + Express · MongoDB · JWT authentication

---

## Project structure

```
attendance-system/
├── backend/     Express API (MongoDB + JWT)
└── frontend/    React app (Vite), fully responsive
```

## 1. Prerequisites

- Node.js 18+
- A MongoDB database — either a local instance (`mongod`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

### Option A: Docker Compose (fastest)

```bash
docker compose up --build
```

This starts MongoDB, the API (port 5000), and the frontend (port 5173) together.
Edit the `JWT_SECRET` in `docker-compose.yml` before using this beyond local testing.

### Option B: Run manually

## 2. Backend setup

```bash
cd backend
cp .env.example .env      # then edit .env with your MongoDB URI & JWT secret
npm install
npm run seed               # optional: creates admin@company.com / Admin@123
npm run dev                 # starts the API on http://localhost:5000
```

Key `.env` values:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `WORK_START_TIME` / `WORK_END_TIME` | Office hours (24h `HH:MM`) used for late/overtime math |
| `LATE_GRACE_MINUTES` | Minutes of grace before a clock-in counts as late |
| `STANDARD_WORK_HOURS` | Hours before extra time counts as overtime |
| `CLIENT_URL` | Frontend origin, for CORS |

## 3. Frontend setup

```bash
cd frontend
cp .env.example .env       # points to your API, defaults to http://localhost:5000/api
npm install
npm run dev                 # starts the app on http://localhost:5173
```

## 4. Using the app

- The **first account you register** automatically becomes an **admin**
  (or run `npm run seed` in `backend/` for a ready-made admin login).
- Admins can add/deactivate/remove employees from **Employees**, view the
  live **Overview** of who's clocked in, and pull **Team Reports** (daily,
  weekly, monthly) per employee or across the whole team.
- Employees land on the **Clock In/Out** screen, punch in/out, and check
  **My Reports** for their own history, lateness, and overtime.
- Everyone can submit and track **Leave Requests** (employees) or review and
  approve/reject them (admins), and read **Notices & Announcements** posted
  by admins — with pinning and priority levels (normal/important/urgent).

## How late & overtime are calculated

- A clock-in after `WORK_START_TIME + LATE_GRACE_MINUTES` is marked **late**,
  with the exact number of minutes late stored on the record.
- Worked time is `clockOut - clockIn`. Anything beyond `STANDARD_WORK_HOURS`
  is logged as **overtime**.
- All of this is configurable per-workspace in `backend/.env` without
  touching code.

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account (first user = admin) |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/attendance/today` | Today's attendance record |
| POST | `/api/attendance/clock-in` | Clock in |
| POST | `/api/attendance/clock-out` | Clock out |
| GET | `/api/attendance/history` | Own history (optional `from`/`to`) |
| GET | `/api/reports/my?period=` | Own daily/weekly/monthly report |
| GET | `/api/reports/team?period=` | Admin: team-wide report |
| GET | `/api/reports/overview` | Admin: live today snapshot |
| GET | `/api/reports/my/export?period=` | Download own report as CSV |
| GET | `/api/reports/team/export?period=` | Admin: download team report as CSV |
| GET/POST/PATCH/DELETE | `/api/users` | Admin: manage employee accounts |
| POST | `/api/leaves` | Employee: submit a leave request |
| GET | `/api/leaves/my` | Employee: view own leave requests |
| DELETE | `/api/leaves/:id` | Cancel a pending leave request |
| GET | `/api/leaves?status=` | Admin: view all leave requests |
| PATCH | `/api/leaves/:id` | Admin: approve/reject a leave request |
| GET | `/api/notices` | Everyone: list notices (pinned first) |
| POST/PATCH/DELETE | `/api/notices` | Admin: create, edit, pin, or delete a notice |

## Responsiveness

The UI uses a collapsible sidebar (desktop) that becomes a hamburger-triggered
drawer plus a bottom tab bar on mobile (≤900px), fluid card grids, and a
horizontally-scrollable table on narrow screens — tested down to 360px wide.

## Production notes

This is a solid starting point. Before shipping to real users, consider:
password reset flows, rate limiting on auth routes, refresh tokens,
audit logging for admin actions, and pagination on large report queries.
