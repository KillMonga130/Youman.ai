# Requirements Document

## Introduction

This spec addresses the critical gap between the AI Humanizer's fully-implemented backend services and the frontend UI. The backend has complete transformation pipelines, detection services, and authentication - but the frontend uses mock data instead of calling these real APIs. This integration is required to make the application deployable.

## Glossary

- **API Integration**: Connecting frontend components to backend REST endpoints
- **Transform API**: Backend endpoint for text humanization
- **Detection API**: Backend endpoint for AI detection testing
- **Auth Flow**: User registration, login, and session management

## Requirements

### Requirement 1

**User Story:** As a user, I want the Editor to actually humanize my text using the backend transformation engine, so that I get real AI-humanized content.

#### Acceptance Criteria

1. WHEN a user clicks "Humanize" in the Editor, THE Frontend SHALL call the backend `/api/v1/transformations/humanize` endpoint
2. WHEN the backend returns humanized text, THE Editor SHALL display the actual transformed content
3. WHEN the backend returns metrics, THE Editor SHALL display real perplexity, burstiness, and modification percentages
4. WHEN the transformation is processing, THE Editor SHALL show a loading state with progress updates
5. WHEN an API error occurs, THE Editor SHALL display a user-friendly error message

### Requirement 2

**User Story:** As a developer, I want the backend to expose transformation endpoints, so that the frontend can call the humanization service.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/v1/transformations/humanize`, THE Backend SHALL accept text, level, strategy, and protectedSegments
2. WHEN processing a transformation request, THE Backend SHALL use the TransformationPipeline service
3. WHEN transformation completes, THE Backend SHALL return humanizedText and metrics in JSON format
4. WHEN validation fails, THE Backend SHALL return HTTP 400 with descriptive error messages
5. WHEN the user is not authenticated, THE Backend SHALL return HTTP 401

### Requirement 3

**User Story:** As a user, I want to test my humanized content against AI detectors, so that I can verify it will pass detection tools.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/v1/detection/analyze`, THE Backend SHALL run detection against configured providers
2. WHEN detection completes, THE Backend SHALL return scores from each provider (GPTZero, Originality, Turnitin, internal)
3. WHEN external APIs are unavailable, THE Backend SHALL use the internal fallback detector
4. WHEN the Editor receives detection results, THE Frontend SHALL display pass/fail indicators for each detector

### Requirement 4

**User Story:** As a user, I want to log in and register, so that I can save my projects and access premium features.

#### Acceptance Criteria

1. WHEN a user visits the app without authentication, THE Frontend SHALL show a login/register option
2. WHEN a user submits login credentials, THE Frontend SHALL call `/api/v1/auth/login` and store the JWT token
3. WHEN a user registers, THE Frontend SHALL call `/api/v1/auth/register` and automatically log them in
4. WHEN the JWT token expires, THE Frontend SHALL attempt to refresh it or redirect to login
5. WHEN a user logs out, THE Frontend SHALL clear tokens and redirect to the home page
