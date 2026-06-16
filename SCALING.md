# Scaling Plan

## Phase 1: Launch-Ready Modular Monolith

This repository is structured as a modular monolith. It is easier to build, deploy, and debug while the company is still validating workflows.

Core production needs:

- MongoDB Atlas with backups enabled
- Strong `JWT_SECRET`
- Razorpay test keys, then live keys
- SMTP provider for lead and invoice emails
- Email OTP verification for registration and login
- Admin users created only by existing admins
- HTTPS on frontend and backend
- Error monitoring such as Sentry
- Uptime monitoring for `/api/health`

## Phase 2: Growth Hardening

Add these before high-volume marketing campaigns:

- Redis cache for dashboard summaries and public catalog data
- BullMQ queue for emails, invoice PDFs, WhatsApp messages, and payment reconciliation
- Cloudinary/S3 for gallery, proposal assets, and client uploads
- Request validation with shared schemas
- Pagination, filtering, and search for all large lists
- Audit logs for admin actions, proposal changes, invoice changes, and payment changes
- Razorpay webhook endpoint with idempotency checks
- Role permissions table instead of hard-coded role checks
- Dedicated notification templates with delivery logs and retry tracking

## Phase 3: Service Split

Split only when the modular monolith becomes a bottleneck:

- API Gateway
- Auth service
- Event service
- Billing service
- Vendor service
- Content service
- Notification service

Recommended infrastructure:

- Frontend on Vercel/Netlify with CDN
- Backend services on containers
- MongoDB Atlas replica set
- Redis managed cache
- Queue workers on separate autoscaling workers
- Object storage and CDN for media
- Centralized logs and traces

## Data Scale Notes

High-growth collections need indexes and pagination:

- `events`: `eventDate`, `status`, `client`, `assignedStaff`
- `proposals`: `client`, `event`, `status`
- `invoices`: `client`, `status`, `invoiceNumber`
- `payments`: `invoice`, `providerOrderId`, `status`
- `vendorAssignments`: `event`, `vendor`, `status`
- `reviews`: `status`, `featured`, `createdAt`

## Security Checklist

- Never store payment card data
- Verify payment webhooks server-side
- Store provider transaction IDs
- Keep admin/staff creation behind admin auth
- Use short-lived access tokens plus refresh tokens for production
- Add rate limits per route group
- Add IP allowlisting for sensitive admin operations if needed
- Log security-sensitive actions
