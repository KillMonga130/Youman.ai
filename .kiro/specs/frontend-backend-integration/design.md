# Frontend-Backend Integration Design

## Overview

This design connects the existing frontend UI to the existing backend services. The backend has fully implemented:
- `TransformationPipeline` - text humanization with strategies, levels, chunking
- `DetectionService` - multi-provider AI detection (GPTZero, Originality, Turnitin, internal)
- `AuthService` - JWT authentication with Redis sessions

The frontend has a complete UI but uses mock data. We need to:
1. Create HTTP routes for transform and detection services
2. Wire the Editor to call real APIs
3. Add authentication flow

## Architecture

```
Frontend (React)                    Backend (Express)
┌─────────────────┐                ┌─────────────────────────┐
│ Editor.tsx      │───POST────────▶│ /api/v1/transformations │
│ - handleHumanize│                │   transform.routes.ts   │
│                 │◀───JSON────────│   TransformationPipeline│
└─────────────────┘                └─────────────────────────┘
                                   
┌─────────────────┐                ┌─────────────────────────┐
│ Editor.tsx      │───POST────────▶│ /api/v1/detection       │
│ - handleDetect  │                │   detection.routes.ts   │
│                 │◀───JSON────────│   DetectionService      │
└─────────────────┘                └─────────────────────────┘

┌─────────────────┐                ┌─────────────────────────┐
│ AuthContext     │───POST────────▶│ /api/v1/auth            │
│ - login/register│                │   auth.routes.ts ✓      │
│                 │◀───JWT─────────│   AuthService ✓         │
└─────────────────┘                └─────────────────────────┘
```

## Components

### 1. Transform Routes (NEW)

Create `packages/backend/src/transform/transform.routes.ts`:

```typescript
// POST /api/v1/transformations/humanize
interface HumanizeRequest {
  text: string;
  level?: 1 | 2 | 3 | 4 | 5;
  strategy?: 'casual' | 'professional' | 'academic' | 'auto';
  protectedSegments?: string[];
}

interface HumanizeResponse {
  humanizedText: string;
  metrics: {
    detectionScore: number;
    perplexity: number;
    burstiness: number;
    modificationPercentage: number;
    sentencesModified: number;
    totalSentences: number;
  };
  processingTime: number;
  strategyUsed: string;
  levelApplied: number;
}
```

### 2. Detection Routes (NEW)

Create `packages/backend/src/detection/detection.routes.ts`:

```typescript
// POST /api/v1/detection/analyze
interface DetectionRequest {
  text: string;
  providers?: ('gptzero' | 'originality' | 'turnitin' | 'internal')[];
}

interface DetectionResponse {
  results: Array<{
    provider: string;
    score: number;
    passed: boolean;
    confidence: number;
  }>;
  averageScore: number;
  overallPassed: boolean;
}
```

### 3. Frontend Editor Integration

Update `packages/frontend/src/pages/Editor.tsx`:
- Replace mock `handleHumanize` with real API call
- Add detection testing after humanization
- Handle loading states and errors

### 4. Frontend Auth Context

Create `packages/frontend/src/context/AuthContext.tsx`:
- Store JWT token in localStorage
- Provide login/logout/register functions
- Auto-refresh tokens before expiry
- Protect routes that require auth

## Data Flow

### Humanization Flow
1. User enters text in Editor
2. User clicks "Humanize"
3. Frontend calls `POST /api/v1/transformations/humanize`
4. Backend validates request, runs TransformationPipeline
5. Backend returns humanized text + metrics
6. Frontend displays results

### Detection Flow
1. After humanization, user can click "Test Detection"
2. Frontend calls `POST /api/v1/detection/analyze`
3. Backend runs DetectionService against all providers
4. Backend returns scores from each provider
5. Frontend displays pass/fail for each detector

## Error Handling

| Error | HTTP Code | Frontend Action |
|-------|-----------|-----------------|
| Empty text | 400 | Show validation error |
| Invalid level | 400 | Show validation error |
| Not authenticated | 401 | Redirect to login |
| Rate limited | 429 | Show retry message |
| Server error | 500 | Show generic error |

## Testing Strategy

- Unit tests for new routes
- Integration test: Frontend → Backend → Response
- E2E test: Full humanization flow

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: API returns valid humanized text
*For any* valid input text, the `/transformations/humanize` endpoint SHALL return non-empty humanized text that differs from the input.
**Validates: Requirements 1.2, 2.2**

### Property 2: Metrics are within valid ranges
*For any* transformation response, perplexity SHALL be between 0-200, burstiness between 0-1, and modification percentage between 0-100.
**Validates: Requirements 1.3**

### Property 3: Detection scores are normalized
*For any* detection response, all provider scores SHALL be between 0-100.
**Validates: Requirements 3.2**

### Property 4: Auth tokens are valid JWT
*For any* successful login, the returned token SHALL be a valid JWT that can be decoded and verified.
**Validates: Requirements 4.2**
