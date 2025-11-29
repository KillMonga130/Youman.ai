# Comprehensive Test Data Guide

This document provides comprehensive test data for testing all functionality of the Youman.ai application.

## Table of Contents

1. [User Accounts](#user-accounts)
2. [Projects](#projects)
3. [Transformations & Detection Scores](#transformations--detection-scores)
4. [Usage Data](#usage-data)
5. [Test Scenarios](#test-scenarios)
6. [API Test Data](#api-test-data)

---

## User Accounts

### Standard User Accounts

```json
{
  "users": [
    {
      "email": "test@example.com",
      "password": "Test123!@#",
      "name": "Test User",
      "tier": "FREE",
      "expectedToken": "jwt_token_here"
    },
    {
      "email": "premium@example.com",
      "password": "Premium123!@#",
      "name": "Premium User",
      "tier": "PRO",
      "expectedToken": "jwt_token_here"
    },
    {
      "email": "admin@example.com",
      "password": "Admin123!@#",
      "name": "Admin User",
      "tier": "ENTERPRISE",
      "role": "admin",
      "expectedToken": "jwt_token_here"
    }
  ]
}
```

### User Credentials for Testing

| Email | Password | Tier | Role | Purpose |
|-------|----------|------|------|---------|
| `test@example.com` | `Test123!@#` | FREE | user | Standard testing |
| `premium@example.com` | `Premium123!@#` | PRO | user | Premium features testing |
| `enterprise@example.com` | `Enterprise123!@#` | ENTERPRISE | user | Enterprise features |
| `admin@example.com` | `Admin123!@#` | ENTERPRISE | admin | Admin panel testing |
| `collaborator@example.com` | `Collab123!@#` | PRO | user | Collaboration testing |

---

## Projects

### Sample Projects Data

#### Project 1: Blog Post (Completed)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "How to Write Better Content",
  "description": "A comprehensive guide on content writing",
  "status": "ACTIVE",
  "wordCount": 1250,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z",
  "detectionScore": 15,
  "ownerId": "user-001"
}
```

#### Project 2: Academic Paper (In Progress)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Machine Learning Research Paper",
  "description": "Research on neural networks",
  "status": "ACTIVE",
  "wordCount": 3500,
  "createdAt": "2024-01-10T09:00:00Z",
  "updatedAt": "2024-01-22T16:20:00Z",
  "detectionScore": 28,
  "ownerId": "user-001"
}
```

#### Project 3: Marketing Copy (Draft)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Product Launch Email",
  "description": "Email campaign for new product",
  "status": "ACTIVE",
  "wordCount": 450,
  "createdAt": "2024-01-25T11:15:00Z",
  "updatedAt": "2024-01-25T11:15:00Z",
  "detectionScore": null,
  "ownerId": "user-001"
}
```

#### Project 4: Social Media Post (High Detection Score)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "name": "LinkedIn Post - Industry Insights",
  "description": "Professional LinkedIn post",
  "status": "ACTIVE",
  "wordCount": 280,
  "createdAt": "2024-01-18T13:30:00Z",
  "updatedAt": "2024-01-19T10:00:00Z",
  "detectionScore": 65,
  "ownerId": "user-001"
}
```

#### Project 5: Archived Project
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "name": "Old Blog Post - Archived",
  "description": "Old content that was archived",
  "status": "ARCHIVED",
  "wordCount": 890,
  "createdAt": "2023-12-01T08:00:00Z",
  "updatedAt": "2023-12-15T12:00:00Z",
  "detectionScore": 22,
  "ownerId": "user-001"
}
```

### Project Test Scenarios

| Scenario | Project Name | Status | Word Count | Detection Score | Purpose |
|----------|-------------|--------|------------|----------------|----------|
| Empty State | None | - | 0 | - | Test dashboard with no projects |
| Single Project | "My First Project" | ACTIVE | 500 | 18 | Test single project display |
| Multiple Projects | Various | ACTIVE | 100-5000 | 10-70 | Test project list |
| High Detection | "AI Content" | ACTIVE | 2000 | 75 | Test high score handling |
| No Detection Score | "New Project" | ACTIVE | 300 | null | Test missing score |
| Archived | "Old Content" | ARCHIVED | 1000 | 25 | Test archived projects |

---

## Transformations & Detection Scores

### Sample Transformation Data

#### Transformation 1: Low Detection Score (Good)
```json
{
  "id": "trans-001",
  "projectId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "COMPLETED",
  "level": 3,
  "strategy": "professional",
  "inputWordCount": 1250,
  "outputWordCount": 1280,
  "inputDetectionScore": 85,
  "outputDetectionScore": 15,
  "modifiedPercentage": 12.5,
  "processingTimeMs": 3500,
  "completedAt": "2024-01-20T14:45:00Z"
}
```

#### Transformation 2: Medium Detection Score
```json
{
  "id": "trans-002",
  "projectId": "550e8400-e29b-41d4-a716-446655440002",
  "status": "COMPLETED",
  "level": 4,
  "strategy": "academic",
  "inputWordCount": 3500,
  "outputWordCount": 3520,
  "inputDetectionScore": 92,
  "outputDetectionScore": 28,
  "modifiedPercentage": 8.3,
  "processingTimeMs": 8200,
  "completedAt": "2024-01-22T16:20:00Z"
}
```

#### Transformation 3: High Detection Score (Needs Improvement)
```json
{
  "id": "trans-003",
  "projectId": "550e8400-e29b-41d4-a716-446655440004",
  "status": "COMPLETED",
  "level": 2,
  "strategy": "casual",
  "inputWordCount": 280,
  "outputWordCount": 285,
  "inputDetectionScore": 88,
  "outputDetectionScore": 65,
  "modifiedPercentage": 5.2,
  "processingTimeMs": 1200,
  "completedAt": "2024-01-19T10:00:00Z"
}
```

#### Transformation 4: Processing (In Progress)
```json
{
  "id": "trans-004",
  "projectId": "550e8400-e29b-41d4-a716-446655440003",
  "status": "PROCESSING",
  "level": 3,
  "strategy": "auto",
  "inputWordCount": 450,
  "outputWordCount": null,
  "inputDetectionScore": null,
  "outputDetectionScore": null,
  "processingTimeMs": null,
  "completedAt": null
}
```

### Detection Score Ranges

| Score Range | Quality | Description | Test Use Case |
|-------------|---------|-------------|---------------|
| 0-20 | Excellent | Very human-like | Test successful transformation |
| 21-40 | Good | Mostly human-like | Test acceptable results |
| 41-60 | Fair | Some AI characteristics | Test improvement needed |
| 61-80 | Poor | Clearly AI-generated | Test high score warning |
| 81-100 | Very Poor | Strongly AI-generated | Test failure scenarios |

---

## Usage Data

### Usage Statistics by Tier

#### FREE Tier User
```json
{
  "userId": "user-001",
  "tier": "FREE",
  "usage": {
    "wordsProcessed": 8500,
    "limit": 10000,
    "remaining": 1500,
    "percentUsed": 85,
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-02-01T00:00:00Z"
  },
  "apiCalls": {
    "used": 85,
    "limit": 100,
    "remaining": 15
  },
  "storage": {
    "used": 52428800,
    "limit": 104857600,
    "remaining": 52428800
  }
}
```

#### PRO Tier User
```json
{
  "userId": "user-002",
  "tier": "PRO",
  "usage": {
    "wordsProcessed": 45000,
    "limit": 100000,
    "remaining": 55000,
    "percentUsed": 45,
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-02-01T00:00:00Z"
  },
  "apiCalls": {
    "used": 320,
    "limit": 1000,
    "remaining": 680
  },
  "storage": {
    "used": 157286400,
    "limit": 524288000,
    "remaining": 367001600
  }
}
```

#### ENTERPRISE Tier User
```json
{
  "userId": "user-003",
  "tier": "ENTERPRISE",
  "usage": {
    "wordsProcessed": 250000,
    "limit": 1000000,
    "remaining": 750000,
    "percentUsed": 25,
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-02-01T00:00:00Z"
  },
  "apiCalls": {
    "used": 1500,
    "limit": 10000,
    "remaining": 8500
  },
  "storage": {
    "used": 1073741824,
    "limit": 10737418240,
    "remaining": 9663676416
  }
}
```

### Usage Limit Test Scenarios

| Scenario | Words Used | Limit | Percent | Status | Test Purpose |
|----------|-----------|-------|---------|--------|--------------|
| Low Usage | 500 | 10000 | 5% | Safe | Normal operation |
| Medium Usage | 5000 | 10000 | 50% | Safe | Normal operation |
| High Usage | 8500 | 10000 | 85% | Warning | Test warning display |
| Near Limit | 9800 | 10000 | 98% | Critical | Test critical warning |
| Over Limit | 10500 | 10000 | 105% | Blocked | Test quota exceeded |

---

## Test Scenarios

### Dashboard Testing

#### Scenario 1: Empty Dashboard
- **Setup**: User with no projects
- **Expected**: Empty state message, "Create Your First Project" button
- **Test**: Click button navigates to editor

#### Scenario 2: Dashboard with Projects
- **Setup**: User with 5 projects (various states)
- **Expected**: 
  - Stats cards show correct totals
  - Project list displays all projects
  - Detection scores shown where available
- **Test**: Verify calculations, sorting, filtering

#### Scenario 3: Dashboard Stats Calculation
- **Setup**: 
  - 10 projects total
  - 3 projects created this month
  - 5000 words processed
  - Average detection score: 25%
- **Expected**: Stats cards show accurate numbers
- **Test**: Verify each stat card value

#### Scenario 4: Usage Limit Display
- **Setup**: User at 85% usage
- **Expected**: 
  - Progress bar shows 85%
  - Warning color (amber)
  - Correct remaining words
- **Test**: Visual display and calculations

### Project Operations Testing

#### Scenario 5: Single Project Delete
- **Setup**: User with 3 projects
- **Action**: Delete one project
- **Expected**: 
  - Project removed from list
  - Stats updated
  - Success message
- **Test**: Verify deletion and UI update

#### Scenario 6: Bulk Delete
- **Setup**: User with 10 projects
- **Action**: Select 3 projects, bulk delete
- **Expected**: 
  - Confirmation modal
  - Progress indicator
  - Results modal
  - Projects removed
- **Test**: Verify bulk operation flow

#### Scenario 7: Project Selection
- **Setup**: User with 5 projects
- **Action**: Select projects using checkboxes
- **Expected**: 
  - Bulk operations toolbar appears
  - Selection count updates
  - Select all works
- **Test**: Selection functionality

### Detection Score Testing

#### Scenario 8: Projects with Detection Scores
- **Setup**: Projects with various detection scores (15, 28, 65, null)
- **Expected**: 
  - Average calculated correctly (only projects with scores)
  - Individual scores displayed
  - "N/A" for projects without scores
- **Test**: Score calculations and display

#### Scenario 9: Missing Detection Scores
- **Setup**: Projects without transformations
- **Expected**: 
  - Detection score shows "N/A"
  - Average excludes null scores
- **Test**: Null handling

---

## API Test Data

### Authentication

#### Login Request
```json
{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

#### Login Response
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-001",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600
  }
}
```

### Projects API

#### Get Projects Request
```
GET /api/v1/projects?page=1&limit=20&status=ACTIVE
```

#### Get Projects Response
```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "How to Write Better Content",
      "description": "A comprehensive guide",
      "status": "ACTIVE",
      "wordCount": 1250,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z",
      "detectionScore": 15
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### Usage API

#### Get Usage Request
```
GET /api/v1/subscription/usage
```

#### Get Usage Response
```json
{
  "success": true,
  "data": {
    "words": {
      "used": 8500,
      "limit": 10000,
      "periodEnd": "2024-02-01T00:00:00Z"
    },
    "tier": "FREE"
  }
}
```

### Transformation API

#### Humanize Request
```json
{
  "text": "This is AI-generated content that needs to be humanized.",
  "level": 3,
  "strategy": "professional",
  "protectedSegments": []
}
```

#### Humanize Response
```json
{
  "id": "trans-001",
  "humanizedText": "This content has been transformed to sound more natural and human-like.",
  "metrics": {
    "detectionScore": 15,
    "perplexity": 45.2,
    "burstiness": 0.78,
    "modificationPercentage": 12.5,
    "sentencesModified": 3,
    "totalSentences": 5
  },
  "processingTime": 3500,
  "strategyUsed": "professional",
  "levelApplied": 3
}
```

---

## Sample Content for Testing

### AI-Generated Content (High Detection Score)

```
Artificial intelligence represents a paradigm shift in computational capabilities, 
enabling machines to process information through sophisticated algorithms that 
mimic cognitive functions. The implementation of neural networks facilitates 
pattern recognition and decision-making processes that were previously exclusive 
to human intelligence.
```

**Expected Detection Score**: 85-95%

### Humanized Content (Low Detection Score)

```
AI is changing how computers work. It lets machines think and learn in ways that 
seem almost human. By using special programs called neural networks, computers 
can now spot patterns and make choices that used to require human thinking.
```

**Expected Detection Score**: 10-25%

### Academic Content

```
The proliferation of artificial intelligence technologies has engendered 
significant transformations across multiple domains. Contemporary research 
demonstrates that machine learning algorithms, particularly deep neural 
networks, exhibit remarkable efficacy in tasks requiring pattern recognition 
and predictive analytics.
```

**Expected Detection Score**: 70-85% (before), 20-35% (after)

### Marketing Content

```
Transform your business with our cutting-edge AI solutions! Boost productivity, 
increase efficiency, and drive growth. Our innovative platform helps you stay 
ahead of the competition with intelligent automation and data-driven insights.
```

**Expected Detection Score**: 60-75% (before), 15-30% (after)

---

## Test Data Setup Scripts

### SQL Seed Data (PostgreSQL)

```sql
-- Insert test users
INSERT INTO users (id, email, password_hash, first_name, last_name, tier, created_at)
VALUES 
  ('user-001', 'test@example.com', '$2b$10$...', 'Test', 'User', 'FREE', NOW()),
  ('user-002', 'premium@example.com', '$2b$10$...', 'Premium', 'User', 'PRO', NOW());

-- Insert test projects
INSERT INTO projects (id, name, description, owner_id, status, word_count, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'How to Write Better Content', 'A comprehensive guide', 'user-001', 'ACTIVE', 1250, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Machine Learning Research Paper', 'Research on neural networks', 'user-001', 'ACTIVE', 3500, NOW() - INTERVAL '15 days', NOW());

-- Insert transformations with detection scores
INSERT INTO transformations (id, project_id, status, input_detection_score, output_detection_score, completed_at)
VALUES 
  ('trans-001', '550e8400-e29b-41d4-a716-446655440001', 'COMPLETED', 85, 15, NOW() - INTERVAL '2 days'),
  ('trans-002', '550e8400-e29b-41d4-a716-446655440002', 'COMPLETED', 92, 28, NOW());
```

### JavaScript Test Data Generator

```javascript
// Generate test projects
function generateTestProjects(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `project-${i + 1}`,
    name: `Test Project ${i + 1}`,
    description: `Description for project ${i + 1}`,
    status: i % 3 === 0 ? 'ARCHIVED' : 'ACTIVE',
    wordCount: Math.floor(Math.random() * 5000) + 100,
    detectionScore: i % 4 === 0 ? null : Math.floor(Math.random() * 80) + 10,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }));
}
```

---

## Performance Test Data

### Large Dataset

- **Users**: 1000
- **Projects per User**: 50-200
- **Transformations per Project**: 1-10
- **Total Projects**: ~150,000
- **Total Transformations**: ~750,000

### Stress Test Scenarios

1. **Pagination**: Test with 10,000+ projects
2. **Bulk Operations**: Test with 100+ selected projects
3. **Real-time Updates**: Test with concurrent transformations
4. **Search**: Test with complex queries on large datasets

---

## Edge Cases

### Edge Case 1: Zero Values
- Projects with 0 word count
- Detection score of exactly 0
- Usage at exactly 0%

### Edge Case 2: Maximum Values
- Projects at word limit
- Detection score of 100
- Usage at 100%

### Edge Case 3: Null/Undefined
- Projects without detection scores
- Missing project descriptions
- Undefined user data

### Edge Case 4: Special Characters
- Project names with emojis: "🚀 My Project 🎉"
- Special characters: "Project & Co. (2024)"
- Unicode: "Проект 项目 مشروع"

---

## Test Checklist

### Dashboard
- [ ] Empty state displays correctly
- [ ] Stats cards calculate correctly
- [ ] Projects list displays all projects
- [ ] Detection scores show correctly
- [ ] Usage limit indicator works
- [ ] Single delete works
- [ ] Bulk delete works
- [ ] Project selection works
- [ ] Pagination works
- [ ] Search/filter works

### Data Integrity
- [ ] Detection scores are accurate
- [ ] Word counts are correct
- [ ] Dates are formatted correctly
- [ ] Calculations are precise
- [ ] Null values handled gracefully

### Performance
- [ ] Page loads quickly (< 2s)
- [ ] Bulk operations complete in reasonable time
- [ ] No memory leaks
- [ ] Smooth scrolling with many projects

---

## Notes

- All dates are in ISO 8601 format (UTC)
- Detection scores are integers 0-100
- Word counts are integers
- IDs are UUIDs
- Passwords should be hashed using bcrypt
- Tokens should be JWT format

---

**Last Updated**: 2024-01-25
**Version**: 1.0.0

