# Context Switcher — Backend API

> A productivity-focused REST API for managing mental context switches with transition rituals, focus analytics, and smart insights.

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)
![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Docker Setup](#docker-setup)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Context Switcher** helps knowledge workers manage the cognitive cost of switching between tasks (e.g., "deep work" → "meetings"). It tracks transitions, guides users through configurable **rituals** (breathing exercises, brain dumps, movement), and generates analytics that reveal focus patterns, optimal work hours, and switch difficulty.

## Features

- **Authentication** — Local + Google OAuth 2.0 with JWT access/refresh tokens stored in HTTP-only cookies
- **Email Verification** — Token-based email verification with resend + rate limiting
- **Context Management** — Create, update, soft-delete work contexts (e.g., "Deep Work", "Admin")
- **Transition Rituals** — Multi-step guided rituals (breathe, braindump, move, pause, intention)
- **Switch Logging** — Log every context switch with optional ritual, focus quality, notes, and tags
- **Analytics Engine** — Key metrics, daily focus charts, context heatmaps, trend analysis, time-of-day data, streaks, and auto-generated insights
- **Avatar Upload** — Cloudinary-backed profile picture uploads with multer
- **Structured Logging** — Winston with console, file, and MongoDB transports + request ID tracing
- **Rate Limiting** — Dual-layer: `express-rate-limit` (global/auth) + `rate-limiter-flexible` (MongoDB-backed)
- **Security** — Helmet CSP, CORS whitelist, bcrypt password hashing, input validation (Zod)
- **Graceful Shutdown** — SIGTERM/SIGINT handlers with timeout-based forced exit

## Architecture

```mermaid
graph TD
    Client[Client / Frontend] --> Express[Express Server]
    Express --> MW[Middleware Layer]
    MW --> |Auth| JWT[JWT Verification]
    MW --> |Validate| Zod[Zod Schemas]
    MW --> |Rate Limit| RL[Rate Limiter]
    Express --> Routes[Route Layer]
    Routes --> Controllers[Controller Layer]
    Controllers --> Services[Service Layer]
    Services --> Models[Mongoose Models]
    Models --> DB[(MongoDB)]
    Services --> Ext[External Services]
    Ext --> Cloudinary[Cloudinary CDN]
    Ext --> SMTP[SMTP / Email]
    Express --> EH[Global Error Handler]
    EH --> Logger[Winston Logger]
    Logger --> Console[Console]
    Logger --> File[Log Files]
    Logger --> MDB[(MongoDB Logs)]
```

## Tech Stack

| Category             | Technology                                                  |
| -------------------- | ----------------------------------------------------------- |
| **Runtime**          | Node.js 20+                                                 |
| **Language**         | TypeScript 5.x (strict mode)                                |
| **Framework**        | Express 5.x                                                 |
| **Database**         | MongoDB 8.x via Mongoose 8.x                                |
| **Authentication**   | JWT (jsonwebtoken) + Passport.js (Google OAuth 2.0)         |
| **Validation**       | Zod                                                         |
| **Logging**          | Winston + winston-mongodb                                   |
| **File Upload**      | Multer → Cloudinary                                         |
| **Email**            | Nodemailer                                                  |
| **Security**         | Helmet, bcryptjs, express-rate-limit, rate-limiter-flexible |
| **Testing**          | Vitest + mongodb-memory-server                              |
| **Linting**          | ESLint + Prettier                                           |
| **Git Hooks**        | Husky + lint-staged + commitlint                            |
| **Package Manager**  | pnpm                                                        |
| **Containerization** | Docker + Docker Compose                                     |

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) — v20.0.0 or higher
- [pnpm](https://pnpm.io/) — v10.x or higher
- [Docker](https://www.docker.com/) — for running MongoDB locally (recommended)
- [Git](https://git-scm.com/)

You'll also need accounts for:

- [MongoDB Atlas](https://www.mongodb.com/atlas) (or local Docker instance)
- [Google Cloud Console](https://console.cloud.google.com/) (for OAuth credentials)
- [Cloudinary](https://cloudinary.com/) (for avatar uploads)
- An SMTP provider (Gmail, Mailtrap, etc.) for transactional emails

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Sumit-Si/context-switcher.git
cd context-switcher
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

```bash
cp .env.sample .env
```

Fill in all required values in `.env` — see [Environment Variables](#environment-variables) below for details.

### 4. Start MongoDB (Docker)

```bash
docker compose up -d
```

This starts a local MongoDB instance on port `27017` with the credentials defined in `docker-compose.yml`.

### 5. Run Database Migrations (if any)

```bash
pnpm run migrate:up
```

### 6. Start Development Server

```bash
pnpm run dev
```

The server will start at `http://localhost:8000` (or your configured `PORT`).

### 7. Explore API Documentation

Open [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs) in your browser for the interactive Swagger UI.

## Environment Variables

Create a `.env` file in the project root. Use `.env.sample` as a reference.

| Variable                | Description                             | Example                                             |
| ----------------------- | --------------------------------------- | --------------------------------------------------- |
| `PORT`                  | Server port                             | `8000`                                              |
| `NODE_ENV`              | Environment mode                        | `development`                                       |
| `MONGO_URI`             | MongoDB connection string               | `mongodb://root:password@localhost:27017`           |
| `CLIENT_URL`            | Frontend URL (for CORS & email links)   | `http://localhost:5173`                             |
| `SERVER_URL`            | Backend URL                             | `http://localhost:8000`                             |
| `ACCESS_TOKEN_SECRET`   | JWT access token secret (min 16 chars)  | _random string_                                     |
| `ACCESS_TOKEN_EXPIRY`   | Access token TTL                        | `15m`                                               |
| `REFRESH_TOKEN_SECRET`  | JWT refresh token secret (min 16 chars) | _random string_                                     |
| `REFRESH_TOKEN_EXPIRY`  | Refresh token TTL                       | `7d`                                                |
| `EMAIL_HOST`            | SMTP host                               | `smtp.gmail.com`                                    |
| `EMAIL_PORT`            | SMTP port                               | `587`                                               |
| `EMAIL_USER`            | SMTP user/email                         | `you@gmail.com`                                     |
| `EMAIL_PASS`            | SMTP password/app password              | _app password_                                      |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID                  | _from Google Console_                               |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret              | _from Google Console_                               |
| `GOOGLE_CALLBACK_URL`   | Google OAuth callback URL               | `http://localhost:8000/api/v1/auth/google/callback` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                   | _from Cloudinary dashboard_                         |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                      | _from Cloudinary dashboard_                         |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                   | _from Cloudinary dashboard_                         |

## Available Scripts

| Script                    | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `pnpm run dev`            | Start development server with hot-reload (tsx watch) |
| `pnpm run build`          | Compile TypeScript to `dist/`                        |
| `pnpm run start`          | Run production build                                 |
| `pnpm run lint`           | Run ESLint                                           |
| `pnpm run lint:fix`       | Auto-fix ESLint issues                               |
| `pnpm run format`         | Format code with Prettier                            |
| `pnpm run format:check`   | Check Prettier formatting                            |
| `pnpm run test`           | Run test suite                                       |
| `pnpm run test:coverage`  | Run tests with coverage report                       |
| `pnpm run test:ui`        | Open Vitest UI                                       |
| `pnpm run migrate:up`     | Run pending migrations                               |
| `pnpm run migrate:down`   | Rollback last migration                              |
| `pnpm run migrate:create` | Create a new migration file                          |

## Docker Setup

### Local MongoDB Only

```bash
docker compose up -d
```

This starts a MongoDB 8.x container with:

- **Port**: `27017`
- **User**: `root`
- **Password**: `password`
- **Database**: `context-switcher-db`

### Full Application

```bash
# Build the application image
docker build -t context-switcher .

# Run with environment file
docker run --env-file .env -p 8000:8000 context-switcher
```

The Dockerfile uses a multi-stage build (builder → runner) for minimal production image size.

## API Endpoints

### Authentication

| Method  | Endpoint                             | Description                  | Auth |
| ------- | ------------------------------------ | ---------------------------- | ---- |
| `POST`  | `/api/v1/auth/register`              | Register a new user          | ✗    |
| `GET`   | `/api/v1/auth/verify-email`          | Verify email with token      | ✗    |
| `POST`  | `/api/v1/auth/resend-verification`   | Resend verification email    | ✗    |
| `POST`  | `/api/v1/auth/login`                 | Login with email & password  | ✗    |
| `POST`  | `/api/v1/auth/logout`                | Logout (clear tokens)        | ✓    |
| `POST`  | `/api/v1/auth/refresh-access-token`  | Refresh access token         | ✗    |
| `GET`   | `/api/v1/auth/me`                    | Get user profile             | ✓    |
| `PATCH` | `/api/v1/auth/update-profile`        | Update profile (with avatar) | ✓    |
| `PATCH` | `/api/v1/auth/update-preferences`    | Update user preferences      | ✓    |
| `POST`  | `/api/v1/auth/change-password`       | Change password              | ✓    |
| `POST`  | `/api/v1/auth/forgot-password`       | Request password reset       | ✗    |
| `POST`  | `/api/v1/auth/reset-password/:token` | Reset password               | ✗    |
| `GET`   | `/api/v1/auth/google`                | Google OAuth login           | ✗    |

### Contexts

| Method   | Endpoint               | Description                   | Auth |
| -------- | ---------------------- | ----------------------------- | ---- |
| `GET`    | `/api/v1/contexts`     | List all contexts (paginated) | ✓    |
| `POST`   | `/api/v1/contexts`     | Create a context              | ✓    |
| `GET`    | `/api/v1/contexts/:id` | Get context by ID             | ✓    |
| `PATCH`  | `/api/v1/contexts/:id` | Update a context              | ✓    |
| `DELETE` | `/api/v1/contexts/:id` | Soft-delete a context         | ✓    |

### Rituals

| Method   | Endpoint                        | Description                  | Auth |
| -------- | ------------------------------- | ---------------------------- | ---- |
| `GET`    | `/api/v1/rituals`               | List all rituals (paginated) | ✓    |
| `POST`   | `/api/v1/rituals`               | Create a ritual              | ✓    |
| `GET`    | `/api/v1/rituals/:id`           | Get ritual by ID             | ✓    |
| `PATCH`  | `/api/v1/rituals/:id`           | Update a ritual              | ✓    |
| `DELETE` | `/api/v1/rituals/:id`           | Soft-delete a ritual         | ✓    |
| `POST`   | `/api/v1/rituals/:id/increment` | Increment ritual usage count | ✓    |

### Switch Logs

| Method   | Endpoint                      | Description                      | Auth |
| -------- | ----------------------------- | -------------------------------- | ---- |
| `GET`    | `/api/v1/switch-logs`         | List all switch logs (paginated) | ✓    |
| `POST`   | `/api/v1/switch-logs`         | Log a context switch             | ✓    |
| `GET`    | `/api/v1/switch-logs/active`  | Get active (ongoing) session     | ✓    |
| `GET`    | `/api/v1/switch-logs/:id`     | Get switch log by ID             | ✓    |
| `PATCH`  | `/api/v1/switch-logs/:id`     | Update a switch log              | ✓    |
| `POST`   | `/api/v1/switch-logs/:id/end` | End a switch session             | ✓    |
| `DELETE` | `/api/v1/switch-logs/:id`     | Soft-delete a switch log         | ✓    |

### Analytics

| Method | Endpoint            | Description                     | Auth |
| ------ | ------------------- | ------------------------------- | ---- |
| `GET`  | `/api/v1/analytics` | Full analytics (dashboard data) | ✓    |

### Health Check

| Method | Endpoint              | Description                 | Auth |
| ------ | --------------------- | --------------------------- | ---- |
| `GET`  | `/api/v1/healthCheck` | System & application health | ✗    |

## Project Structure

```
context-switcher/
├── src/
│   ├── config/              # App configuration
│   │   ├── config.ts        # Zod-validated env variables
│   │   ├── db.ts            # MongoDB connection with pooling
│   │   ├── cloudinary.ts    # Cloudinary upload/delete helpers
│   │   ├── logger.ts        # Winston logger (console + file + MongoDB)
│   │   ├── passport.ts      # Google OAuth strategy
│   │   ├── rateLimiter.ts   # Rate limiting configuration
│   │   └── swagger.ts       # Swagger/OpenAPI setup
│   ├── constants/           # App-wide constants and enums
│   ├── controllers/         # Request handlers (thin layer)
│   ├── middlewares/         # Express middleware
│   │   ├── auth.middleware.ts      # JWT verification
│   │   ├── validate.middleware.ts  # Zod request validation
│   │   ├── multer.middleware.ts    # File upload handling
│   │   ├── rateLimit.middleware.ts # Per-request rate limiting
│   │   └── requestID.middleware.ts # Request ID injection
│   ├── models/              # Mongoose schemas & models
│   ├── routes/              # Express route definitions
│   ├── services/            # Business logic layer
│   │   ├── base.service.ts  # Shared pagination & query logic
│   │   ├── auth.service.ts  # Authentication & user management
│   │   ├── context.service.ts
│   │   ├── ritual.service.ts
│   │   ├── switchLog.service.ts
│   │   └── analytics.service.ts
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── ApiError.ts      # Custom error class
│   │   ├── ApiResponse.ts   # Standardized response wrapper
│   │   ├── AsyncHandler.ts  # Async error boundary for Express
│   │   ├── globalErrorHandler.ts  # Centralized error handler
│   │   ├── analyticsEngine.ts     # Complex aggregation pipelines
│   │   └── ...
│   ├── validators/          # Zod validation schemas
│   ├── app.ts               # Express app setup
│   └── index.ts             # Server entry point
├── tests/
│   ├── integration/         # API integration tests
│   ├── unit/                # Unit tests
│   ├── property/            # Property-based tests
│   └── setup.ts             # Test setup (mongodb-memory-server)
├── migrations/              # Database migration scripts
├── logs/                    # Log output directory
├── public/temp/             # Temporary file uploads
├── docker-compose.yml       # Local MongoDB container
├── Dockerfile               # Multi-stage production build
├── vitest.config.ts         # Test configuration
├── eslint.config.mjs        # ESLint flat config
├── tsconfig.json            # TypeScript configuration
├── tsconfig.build.json      # Production build config
└── .env.sample              # Environment template
```

## Testing

The project uses [Vitest](https://vitest.dev/) with [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) for isolated, fast tests.

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test:coverage

# Open interactive Vitest UI
pnpm run test:ui
```

### Coverage Thresholds

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 70%       |
| Functions  | 70%       |
| Branches   | 50%       |
| Statements | 70%       |

### Test Types

- **Unit tests** — Services, validators, utilities
- **Integration tests** — Full API request/response with in-memory MongoDB
- **Property-based tests** — Validator edge cases with random inputs

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Sumit-Si">Sumit Singh Tomar</a></sub>
</div>
