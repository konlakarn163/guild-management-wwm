# Guild Management System (Where Winds Meet)

ระบบบริหารจัดการกิลด์สำหรับเกม Where Winds Meet

## Stack

- Frontend: Next.js App Router + TailwindCSS + GSAP + dnd-kit + react-konva
- Backend: Express + TypeScript (แยก routes / controllers / services)
- Auth: Supabase Auth (Discord OAuth)
- Database: Supabase Postgres

## Project Structure

### Frontend

- app: routing ของ Next.js
- components: UI และ feature components
- lib: client api, auth helper, type

### Backend

- backend/src/routes: route layer
- backend/src/controllers: controller layer
- backend/src/services: service layer
- backend/src/middlewares: auth, rbac, error
- backend/supabase/schema.sql: SQL schema เริ่มต้น

## Environment Variables

คัดลอกไฟล์ env ตัวอย่างก่อน

```bash
copy .env.example .env
copy backend/.env.example backend/.env
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (backend/.env)

```env
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Install

```bash
npm install
npm --prefix backend install
```

## Run Development

รัน frontend + backend พร้อมกัน:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## Build / Lint

```bash
npm run lint
npm --prefix backend run build
```

## Main API Endpoints

Public:

- GET /api/public/guild

Member:

- GET /api/profile/me
- PUT /api/profile/me
- GET /api/guild-war/registrations/:weekId
- POST /api/guild-war/registrations
- DELETE /api/guild-war/registrations/:weekId

Admin:

- GET /api/users
- PATCH /api/users/:id
- POST /api/users/:id/approve
- POST /api/users/:id/reject
- POST /api/users/bulk-approve

Super Admin:

- DELETE /api/users/:id
- GET /api/guild-settings
- PUT /api/guild-settings

## Supabase Setup Notes

1. รัน SQL ใน backend/supabase/schema.sql
2. ตั้งค่า Discord provider ใน Supabase Auth
3. ใส่ redirect URL ของเว็บ เช่น http://localhost:3000/dashboard
4. ตั้ง RLS ตาม policy ที่ทีมต้องการ (ตอนนี้ backend ใช้ service role key)
