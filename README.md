# Compliance System

A foundation for an enterprise compliance management application.

## Structure

- `backend/` - Node.js + Express + MongoDB API
- `frontend/` - React + Vite + Tailwind UI dashboard

## Getting Started

### Backend

```bash
cd backend
npm install
npm run dev
```

Approval handoff emails require SMTP settings in `backend/.env`:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@example.com
SMTP_PASS=your_password
MAIL_FROM=notifications@example.com
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
