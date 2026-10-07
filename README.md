# Festive Events MERN Platform

Large-scale event management platform built with the MERN stack.

## Features

- Public event management website with service, package, testimonial, and inquiry sections
- Role-based login for admin, client, staff, and vendor users
- Email verification OTP after registration
- Login OTP verification before issuing JWT sessions
- Nodemailer email notifications for inquiries, proposals, invoices, payment receipts, and account messages
- Client event requests and dashboard tracking
- Admin/staff event pipeline management
- Proposal generator with approval/rejection workflow
- Automatic invoice generation after proposal approval
- PDF invoice download
- Razorpay-ready online payment flow with demo fallback
- Event calendar
- Vendor directory and vendor assignment workflow
- Vendor dashboard for assigned work
- Review/testimonial submission and approval workflow
- Secure API foundation with JWT auth, rate limiting, Helmet, compression, and MongoDB indexes

## Project Structure

```txt
client/   React + Vite frontend
server/   Node.js + Express + MongoDB API
```

## Local Setup

```bash
npm run install:all
copy server\.env.example server\.env
npm run dev
```

By default, `npm run dev` starts a local MongoDB process on `mongodb://127.0.0.1:27017/festive` and stores its data in the ignored `.mongodb/` folder. If you prefer MongoDB Atlas, replace `MONGO_URI` in `server/.env` with your Atlas connection string; the local Mongo helper will skip startup automatically.

## Docker Setup

The Docker stack uses MongoDB Atlas for the database. Before starting it:

1. In Atlas, create a database user and allow your current public IP in **Network Access**.
2. Copy `server/.env.example` to `server/.env` if needed, then set `MONGO_URI` to the connection string from Atlas. Use `festive` as the database name and URL-encode special characters in the password.
3. Keep `server/.env` private; it is excluded from Git. Compose loads backend settings from this file.

Run the frontend and API with Docker:

```bash
docker compose up --build
```

This starts:

- React frontend: `http://localhost:5180`
- Express API: `http://localhost:5001/api/health`
- Database: your MongoDB Atlas cluster (no local MongoDB container is started)

The Docker setup uses demo payments. Existing data in the old local Docker MongoDB volume is not copied automatically; migrate it separately if you need to keep it.
Stop everything with:

```bash
docker compose down
```

Configure SMTP in `server/.env` to send real email OTPs and notifications:

```txt
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
MAIL_FROM=Festive Events <hello@yourdomain.com>
MAIL_TO=admin@yourdomain.com
```

If SMTP is not configured in development, OTPs are returned in the API response so the flow can be tested locally. In production, OTPs are sent only by email.

## AI Proposal Drafting

Admins and staff can select an event in the proposal form and click **Generate Draft**. The backend uses Ollama locally and fills the editable proposal fields.

Install Ollama and pull a model, then add these values to `server/.env`:

```txt
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:latest
```

If Ollama is unavailable, the app falls back to a local template so the proposal flow remains testable.

Frontend dev URL:

```txt
http://localhost:5180
```

Default development admin:

```txt
Email: admin@festive.local
Password: Admin@12345
```

## Deployment

- Frontend: Vercel or Netlify
- Backend: Render, Railway, AWS, Azure, or a VPS
- Database: MongoDB Atlas
- Payments: Razorpay test keys first, then live keys after webhook verification is added
- Images/files: Cloudinary, S3, or Azure Blob Storage

## Large-Scale Direction

Start as a modular MERN application. When usage grows, split by domain:

- Identity service: auth, users, RBAC
- Event service: event requests, calendar, staff assignment
- Commerce service: proposals, invoices, payments, refunds, webhooks
- Vendor service: vendor directory, assignments, vendor payouts
- Content service: services, packages, gallery, reviews
- Notification service: email, WhatsApp, SMS, push notifications

Use Redis/BullMQ for background jobs, CDN-backed media storage, payment webhooks, audit logs, and observability before going live at high volume.
