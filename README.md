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

Update `server/.env` with your MongoDB Atlas URI before using database-backed features.

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
