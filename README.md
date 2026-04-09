# Hosting Nepal

Web hosting platform with domain registration, hosting management, and billing -- built for the Nepali market.

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, TanStack React Query, Zustand
- **Backend**: NestJS, TypeScript, PostgreSQL, Redis
- **Infrastructure**: Docker, Docker Compose

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

## Quick Start (Docker)

1. Clone the repository and navigate to the project directory.

2. Start all services:

```bash
docker-compose up -d
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api/v1

4. Stop services:

```bash
docker-compose down
```

## Local Development

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend runs at http://localhost:3000.

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

The backend runs at http://localhost:3001.

### Database

Start only PostgreSQL and Redis:

```bash
docker-compose up -d postgres redis
```

## Environment Variables

### Frontend

| Variable              | Description          | Default                          |
|-----------------------|----------------------|----------------------------------|
| NEXT_PUBLIC_API_URL   | Backend API base URL | http://localhost:3001/api/v1     |
| NEXT_PUBLIC_APP_NAME  | Application name     | Hosting Nepal                    |

### Backend

| Variable               | Description              | Default                    |
|------------------------|--------------------------|----------------------------|
| DATABASE_HOST          | PostgreSQL host          | localhost                  |
| DATABASE_PORT          | PostgreSQL port          | 5432                       |
| DATABASE_USER          | PostgreSQL user          | hosting_nepal              |
| DATABASE_PASSWORD      | PostgreSQL password      | hosting_nepal_secret       |
| DATABASE_NAME          | Database name            | hosting_nepal              |
| REDIS_HOST             | Redis host               | localhost                  |
| REDIS_PORT             | Redis port               | 6379                       |
| JWT_SECRET             | JWT signing secret       | (set in production)        |
| JWT_REFRESH_SECRET     | Refresh token secret     | (set in production)        |

## Project Structure

```
Hosting_Nepal/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   └── src/
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    └── src/
        ├── app/          # Next.js App Router pages
        ├── lib/          # API client, utilities
        ├── types/        # TypeScript interfaces
        ├── store/        # Zustand state stores
        └── hooks/        # Custom React hooks
```

## API Documentation

API docs are available at http://localhost:3001/api/docs when the backend is running (Swagger UI).
