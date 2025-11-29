# Part 7: Development Guide

**AI Humanizer - Complete Documentation**

[← Back to README](../README.md) | [Previous: API Documentation →](PART_6_API_DOCS.md) | [Next: Deployment →](PART_8_DEPLOYMENT.md)

---

## Table of Contents

- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guide](#testing-guide)
- [Debugging](#debugging)
- [Contributing](#contributing)

---

## Project Structure

```
ai-humanizer/
├── packages/
│   ├── backend/              # Backend API server
│   │   ├── src/
│   │   │   ├── api/          # API gateway and routes
│   │   │   ├── auth/         # Authentication
│   │   │   ├── project/      # Project management
│   │   │   ├── transform/    # Text transformation
│   │   │   ├── detection/    # AI detection
│   │   │   ├── collaboration/# Real-time collaboration
│   │   │   ├── database/     # Database connections
│   │   │   └── ...
│   │   ├── prisma/           # Database schema
│   │   └── package.json
│   │
│   ├── frontend/             # Frontend web app
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Page components
│   │   │   ├── api/          # API client
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── shared/               # Shared code
│       └── src/
│
├── docs/                     # Documentation
├── k8s/                      # Kubernetes manifests
└── package.json              # Root package.json
```

---

## Development Workflow

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ai-humanizer.git
cd ai-humanizer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
# Edit packages/frontend/.env
```

### 4. Start Databases

```bash
docker-compose up -d postgres mongodb redis
```

### 5. Run Migrations

```bash
cd packages/backend
npx prisma generate
npx prisma migrate dev
```

### 6. Start Development Servers

```bash
# From root - starts both
npm run dev

# Or separately:
# Terminal 1: Backend
cd packages/backend && npm run dev

# Terminal 2: Frontend
cd packages/frontend && npm run dev
```

---

## Code Style Guidelines

### TypeScript

#### Naming Conventions

```typescript
// Interfaces and Types: PascalCase
interface UserProfile {
  id: string;
  name: string;
}

// Variables and Functions: camelCase
const userName = 'John';
function getUserById(id: string) {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Classes: PascalCase
class UserService {
  // ...
}
```

#### File Naming

- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `camelCase.types.ts` (e.g., `user.types.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`

#### Code Organization

```typescript
// 1. Imports (external first, then internal)
import express from 'express';
import { UserService } from './services/user.service';

// 2. Types and Interfaces
interface Request {
  // ...
}

// 3. Constants
const DEFAULT_LIMIT = 20;

// 4. Functions/Classes
export class UserController {
  // ...
}
```

### React Components

#### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

// 2. Types
interface Props {
  userId: string;
  onUpdate: (user: User) => void;
}

// 3. Component
export function UserProfile({ userId, onUpdate }: Props) {
  // 4. Hooks
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // ...
  }, [userId]);
  
  // 5. Handlers
  const handleUpdate = () => {
    // ...
  };
  
  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

#### Hooks

- Use custom hooks for reusable logic
- Prefix custom hooks with `use`
- Keep hooks focused and single-purpose

```typescript
// Custom hook
export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);
  
  return { user, loading };
}
```

### Backend Code

#### Service Pattern

```typescript
// Service class
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private logger: Logger
  ) {}
  
  async getUserById(id: string): Promise<User> {
    this.logger.info('Getting user', { id });
    
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    return user;
  }
}
```

#### Error Handling

```typescript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    throw new BadRequestError(error.message);
  }
  
  this.logger.error('Operation failed', { error });
  throw new InternalServerError('Operation failed');
}
```

---

## Testing Guide

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- packages/backend/src/auth/auth.test.ts

# Watch mode
npm test -- --watch
```

### Writing Tests

#### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { UserService } from './user.service';

describe('UserService', () => {
  it('should get user by id', async () => {
    const service = new UserService(mockRepository, mockLogger);
    const user = await service.getUserById('user-id');
    
    expect(user).toBeDefined();
    expect(user.id).toBe('user-id');
  });
});
```

#### Integration Tests

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestServer } from '../test-setup';

describe('Projects API', () => {
  let server: TestServer;
  
  beforeAll(async () => {
    server = await createTestServer();
  });
  
  it('should create project', async () => {
    const response = await server.post('/api/v1/projects', {
      name: 'Test Project',
      content: 'Test content'
    });
    
    expect(response.status).toBe(201);
    expect(response.data.data.name).toBe('Test Project');
  });
});
```

### Test Coverage

Target coverage:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

---

## Debugging

### Backend Debugging

#### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "skipFiles": ["<node_internals>/**"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Logging

```typescript
import { logger } from './utils/logger';

logger.info('User created', { userId: user.id });
logger.error('Operation failed', { error, context });
logger.debug('Debug information', { data });
```

### Frontend Debugging

#### React DevTools

Install React DevTools browser extension for component inspection.

#### Console Logging

```typescript
console.log('Debug info', { data });
console.error('Error', error);
```

#### Network Debugging

Use browser DevTools Network tab to inspect API requests.

---

## Contributing

### Git Workflow

1. **Create Branch**

```bash
git checkout -b feature/amazing-feature
```

2. **Make Changes**

```bash
# Make your changes
git add .
git commit -m "feat: add amazing feature"
```

3. **Push and Create PR**

```bash
git push origin feature/amazing-feature
# Create PR on GitHub
```

### Commit Messages

Use conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

### Code Review

- All PRs require review
- Address review comments
- Ensure tests pass
- Update documentation

---

## Development Tools

### VS Code Extensions

Recommended extensions:
- ESLint
- Prettier
- TypeScript
- Prisma
- Tailwind CSS IntelliSense

### Useful Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Database
npm run db:studio  # Prisma Studio
npm run db:migrate # Run migrations
```

---

[← Back to README](../README.md) | [Previous: API Documentation →](PART_6_API_DOCS.md) | [Next: Deployment →](PART_8_DEPLOYMENT.md)

