# Database Schema

**AI Humanizer - Database Documentation**

[← Back to README](../README.md)

---

## Table of Contents

- [Overview](#overview)
- [PostgreSQL Schema](#postgresql-schema)
- [MongoDB Collections](#mongodb-collections)
- [Entity Relationships](#entity-relationships)
- [Indexes](#indexes)
- [Migrations](#migrations)

---

## Overview

AI Humanizer uses a multi-database architecture:

- **PostgreSQL**: Relational data (users, projects, subscriptions)
- **MongoDB**: Document storage (documents, versions, collaboration)
- **Redis**: Caching and sessions

---

## PostgreSQL Schema

### User Management

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### User Preferences

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_level INTEGER DEFAULT 3,
  default_strategy VARCHAR(50) DEFAULT 'auto',
  default_language VARCHAR(10) DEFAULT 'en',
  auto_save_enabled BOOLEAN DEFAULT true,
  auto_save_interval_secs INTEGER DEFAULT 120,
  dark_mode_enabled BOOLEAN DEFAULT false,
  keyboard_shortcuts JSONB,
  custom_dictionary JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Projects

#### Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  word_count INTEGER DEFAULT 0,
  document_id VARCHAR(255),
  settings JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_name ON projects(name);
```

### Transformations

#### Transformations Table

```sql
CREATE TABLE transformations (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  input_text TEXT,
  output_text TEXT,
  input_word_count INTEGER,
  output_word_count INTEGER,
  input_detection_score INTEGER,
  output_detection_score INTEGER,
  metrics JSONB,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_transformations_project_id ON transformations(project_id);
CREATE INDEX idx_transformations_status ON transformations(status);
CREATE INDEX idx_transformations_created_at ON transformations(created_at);
```

### Subscriptions

#### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) DEFAULT 'FREE',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  monthly_word_limit INTEGER,
  monthly_api_call_limit INTEGER,
  storage_limit BIGINT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
```

---

## MongoDB Collections

### Documents Collection

Stores document content and metadata:

```javascript
{
  _id: ObjectId,
  projectId: String,
  content: String,
  metadata: {
    wordCount: Number,
    language: String,
    createdAt: Date,
    updatedAt: Date
  }
}
```

### Versions Collection

Stores document versions:

```javascript
{
  _id: ObjectId,
  projectId: String,
  version: Number,
  content: String,
  changes: Array,
  createdAt: Date,
  createdBy: String
}
```

### Collaboration Sessions Collection

Stores real-time collaboration data:

```javascript
{
  _id: ObjectId,
  projectId: String,
  participants: Array,
  changes: Array,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Entity Relationships

### User Relationships

```
User
  ├── Subscription (1:1)
  ├── Projects (1:many)
  ├── Sessions (1:many)
  ├── ApiKeys (1:many)
  ├── UserPreferences (1:1)
  └── MfaDevices (1:many)
```

### Project Relationships

```
Project
  ├── Owner (many:1 User)
  ├── Collaborators (many:many User)
  ├── Versions (1:many)
  ├── Transformations (1:many)
  └── Branches (1:many)
```

---

## Indexes

### Performance Indexes

- User email lookup
- Project owner queries
- Transformation status filtering
- Date range queries

### Composite Indexes

```sql
CREATE INDEX idx_usage_user_resource_period 
ON usage_records(user_id, resource_type, period_start);
```

---

## Migrations

### Running Migrations

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

### Creating Migrations

```bash
npx prisma migrate dev --name add_new_feature
```

---

[← Back to README](../README.md)

