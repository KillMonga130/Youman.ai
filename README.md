# AI Humanizer

Transform AI-generated text into natural, human-like content that maintains authenticity while avoiding detection by AI content detectors.

## Project Structure

```
ai-humanizer/
├── packages/
│   ├── backend/          # Node.js/Express API server
│   ├── frontend/         # React web application
│   └── shared/           # Shared types and utilities
├── docker-compose.yml    # Docker development environment
├── package.json          # Root package.json (workspaces)
├── tsconfig.base.json    # Shared TypeScript configuration
├── .eslintrc.json        # ESLint configuration
└── .prettierrc           # Prettier configuration
```

## Prerequisites

- Node.js 18+
- npm 9+
- Docker and Docker Compose (for local development)

## Getting Started

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Environment

#### Using Docker (Recommended)

```bash
npm run docker:up
```

This starts:

- Backend API on http://localhost:3001
- Frontend on http://localhost:3000
- PostgreSQL on localhost:5432
- MongoDB on localhost:27017
- Redis on localhost:6379

#### Without Docker

```bash
# Start backend
cd packages/backend && npm run dev

# Start frontend (in another terminal)
cd packages/frontend && npm run dev
```

## Available Scripts

- `npm run dev` - Start all packages in development mode
- `npm run build` - Build all packages
- `npm run test` - Run tests across all packages
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking
- `npm run docker:up` - Start Docker development environment
- `npm run docker:down` - Stop Docker environment
- `npm run docker:build` - Build Docker images
- `npm run docker:logs` - View Docker container logs

## Tech Stack

### Backend

- Node.js with Express
- TypeScript (strict mode)
- PostgreSQL (user data, metadata)
- MongoDB (document storage)
- Redis (caching, sessions)

### Frontend

- React 18
- TypeScript
- Vite
- React Router

## License

Private - All rights reserved
