# mdnotes

Real-time collaborative markdown notes with live editing, multi-user cursors, live chat, authentication, and document sharing.

## Features

- ✅ **Authentication** — Email/password register, login, JWT sessions
- ✅ **Forgot/Reset Password** — Token-based password reset via email
- ✅ **Profile Editing** — Name, bio, avatar color picker, password change
- ✅ **Notes CRUD** — Create, read, update, delete notes
- ✅ **Real-time Editing** — Socket.IO live sync across all collaborators
- ✅ **Colored Cursors & Pointers** — See others' live mouse pointers
- ✅ **Document Sharing** — Invite users with view or edit permission
- ✅ **Live Chat** — Per-document real-time chat panel
- ✅ **Markdown Preview** — Split-pane with syntax highlighting
- ✅ **Collapsible Sidebar** — Clean OLED dark UI
- ✅ **Vue 3** — Component-based with Pinia + Vue Router
- ✅ **Docker** — Dockerfile + docker-compose for easy deployment

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Vite, Pinia, Vue Router |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL 16 |
| Auth | JWT + bcrypt |
| Email | Nodemailer |
| Containerization | Docker, docker-compose |
| Package Manager | pnpm |

## Local Development

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (or use Docker)

### 1. Start PostgreSQL

```bash
# Via docker-compose (easiest)
docker-compose up db -d
```

### 2. Backend

```bash
cd backend
pnpm install
cp .env.example .env   # edit as needed
pnpm dev
```

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

App: http://localhost:5173
API: http://localhost:3001

## Docker (Full Stack)

```bash
# Build & run everything
docker-compose up --build

# App will be at http://localhost:3001
```

## Email Setup (Password Reset)

For development, use [Ethereal Email](https://ethereal.email):
1. Create a free account at ethereal.email
2. Copy SMTP credentials to `backend/.env`
3. Reset emails will show a preview URL in the console

For production, set real SMTP credentials (Gmail, SendGrid, etc.)

## Environment Variables

See `backend/.env.example` for all options.

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT tokens (change in prod!) |
| `SMTP_*` | Email server settings for password reset |
| `DB_*` | PostgreSQL connection details |
| `FRONTEND_URL` | CORS origin for frontend |

## Project Structure

```
mdnotes/
├── frontend/           # Vue 3 + Vite
│   └── src/
│       ├── components/ # Reusable components
│       ├── views/      # Page views
│       ├── stores/     # Pinia stores
│       ├── router/     # Vue Router
│       └── lib/        # Utilities, API client, socket
├── backend/            # Express + Socket.IO
│   └── src/
│       ├── routes/     # REST API routes
│       ├── socket/     # Socket.IO handlers
│       ├── middleware/  # Auth middleware
│       └── services/   # Email service
├── Dockerfile          # Multi-stage build
└── docker-compose.yml  # Full stack orchestration
```
