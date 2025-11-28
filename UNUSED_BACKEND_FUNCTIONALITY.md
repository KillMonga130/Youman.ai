# Unused Backend Functionality Report

This document lists all backend API endpoints and functionality that exist but are **NOT being used** in the frontend.

## 📋 Summary

The backend has extensive functionality that's implemented but not exposed through the frontend UI. This includes:

- **Templates System** - Fully implemented but no UI
- **Branch Management** - Partially implemented in API client but no UI
- **A/B Testing** - Partially implemented but missing many features
- **Subscription Management** - Missing upgrade/downgrade UI
- **Collaboration Features** - Missing invite/management UI
- **Tone Analysis** - Partially implemented
- **Template Advanced Features** - Export, import, share, rate, duplicate

---

## 🔴 **COMPLETELY UNUSED (No Frontend Implementation)**

### 1. **Template System** (`/api/templates`)
**Status:** ✅ Backend fully implemented, ❌ No frontend UI

**Available Endpoints:**
- `GET /templates` - List templates with filtering
- `GET /templates/categories` - Get template categories
- `GET /templates/:id` - Get template details
- `POST /templates` - Create custom template
- `PATCH /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/apply` - Apply template to project
- `GET /templates/:id/export` - Export template configuration
- `POST /templates/import` - Import template configuration
- `POST /templates/:id/share` - Share template with user
- `DELETE /templates/shares/:shareId` - Remove template share
- `GET /templates/:id/shares` - Get template shares
- `POST /templates/:id/rate` - Rate a template
- `POST /templates/:id/duplicate` - Duplicate a template

**API Client Status:** ✅ Methods exist (`getTemplates`, `getTemplate`, `createTemplate`, `deleteTemplate`)
**UI Status:** ❌ No UI components exist

---

### 2. **Branch Management - Advanced Features** (`/api/branches`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `GET /branches` - List branches (✅ Used)
- `POST /branches` - Create branch (✅ Used)
- `GET /branches/:id` - Get branch details
- `PUT /branches/:id/default` - Set branch as default
- `PUT /branches/:id/rename` - Rename branch
- `POST /branches/switch` - Switch to a branch
- `POST /branches/merge` - Merge branches (✅ Used)
- `POST /branches/compare` - Compare branches
- `GET /branches/tree/:projectId` - Get branch tree structure
- `GET /branches/default/:projectId` - Get default branch
- `DELETE /branches/:id` - Delete branch (✅ Used)

**API Client Status:** ⚠️ Only `getProjectBranches`, `createBranch`, `mergeBranch`, `deleteBranch` exist
**Missing from API Client:**
- `switchBranch`
- `setDefaultBranch`
- `renameBranch`
- `getBranchTree`
- `getDefaultBranch`
- `compareBranches`
- `getBranch` (by ID)

**UI Status:** ❌ No UI for branch management exists

---

### 3. **A/B Testing - Advanced Features** (`/api/ab-testing`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `POST /ab-testing/variations` - Generate variations (✅ Used via `generateVariations`)
- `POST /ab-testing/compare` - Compare variations
- `POST /ab-testing/tests` - Create A/B test (✅ Used)
- `GET /ab-testing/tests/:testId` - Get test (✅ Used)
- `PATCH /ab-testing/tests/:testId/status` - Update test status
- `POST /ab-testing/track` - Track performance metrics
- `GET /ab-testing/metrics/:variationId` - Get performance metrics
- `POST /ab-testing/tests/:testId/winner` - Select winning variation
- `GET /ab-testing/tests/:testId/report` - Generate test report

**API Client Status:** ⚠️ Only `createABTest` and `getABTest` exist
**Missing from API Client:**
- `updateABTestStatus`
- `deleteABTest`
- `trackPerformance`
- `getPerformanceMetrics`
- `selectWinner`
- `generateTestReport`
- `compareVariations`

**UI Status:** ⚠️ Basic variation generation exists in Editor, but no A/B test management UI

---

### 4. **Subscription Management** (`/api/subscription`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `GET /subscription` - Get subscription (✅ Used)
- `POST /subscription` - Create subscription
- `PUT /subscription` - Update subscription tier (upgrade/downgrade) ❌ **NOT IN API CLIENT**
- `DELETE /subscription` - Cancel subscription ❌ **NOT IN API CLIENT**
- `GET /subscription/usage` - Get usage (✅ Used)
- `POST /subscription/usage` - Track usage
- `GET /subscription/quota/check` - Check quota ❌ **NOT IN API CLIENT**
- `GET /subscription/billing` - Get billing dashboard ❌ **NOT IN API CLIENT**
- `GET /subscription/upgrade-preview` - Get upgrade preview ❌ **NOT IN API CLIENT**
- `GET /subscription/tiers` - Get available tiers ❌ **NOT IN API CLIENT**

**API Client Status:** ⚠️ Only `getSubscription` exists
**UI Status:** ⚠️ Shows subscription info but no upgrade/downgrade functionality (shows "coming soon")

---

### 5. **Collaboration - Advanced Features** (`/api/collaboration`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `GET /collaboration/invitations` - Get my invitations (✅ Used)
- `POST /collaboration/invitations/accept` - Accept invitation (✅ Used)
- `POST /collaboration/invitations/decline` - Decline invitation (✅ Used)
- `POST /collaboration/projects/:projectId/invite` - Invite collaborator (✅ Used)
- `GET /collaboration/projects/:projectId/invitations` - Get project invitations ❌ **NOT IN API CLIENT**
- `DELETE /collaboration/projects/:projectId/invitations/:invitationId` - Revoke invitation ❌ **NOT IN API CLIENT**
- `GET /collaboration/projects/:projectId/collaborators` - List collaborators (✅ Used)
- `PATCH /collaboration/projects/:projectId/collaborators/:userId` - Update role (✅ Used)
- `DELETE /collaboration/projects/:projectId/collaborators/:userId` - Remove collaborator (✅ Used)
- `GET /collaboration/projects/:projectId/activity` - Get activity log (✅ Used)

**API Client Status:** ✅ Most methods exist
**UI Status:** ❌ No UI for inviting collaborators or managing them (only shows pending invitations in Advanced page)

---

### 6. **Tone Analysis** (`/api/tone`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `POST /tone/analyze` - Analyze tone (✅ Used via `analyzeTone`)
- `POST /tone/adjust` - Adjust tone ❌ **NOT IN API CLIENT**
- `POST /tone/emotions` - Detect emotions (✅ Used via `detectEmotions`)
- `POST /tone/consistency` - Check tone consistency ❌ **NOT IN API CLIENT**
- `POST /tone/target` - Target specific tone ❌ **NOT IN API CLIENT**

**API Client Status:** ⚠️ Only `analyzeTone` and `detectEmotions` exist
**UI Status:** ❌ No UI for tone analysis features

---

### 7. **Template Advanced Features**
**Status:** ❌ Not implemented in API client

**Missing Methods:**
- `applyTemplate` - Apply template to project
- `exportTemplate` - Export template configuration
- `importTemplate` - Import template configuration
- `shareTemplate` - Share template with user
- `unshareTemplate` - Remove template share
- `getTemplateShares` - Get template shares
- `rateTemplate` - Rate a template
- `duplicateTemplate` - Duplicate a template
- `getTemplateCategories` - Get available categories

---

### 8. **Scheduled Jobs - Update Feature** (`/api/scheduling`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `GET /scheduling/jobs` - List jobs (✅ Used)
- `POST /scheduling/jobs` - Create job (✅ Used)
- `PATCH /scheduling/jobs/:id` - Update job ❌ **NOT IN API CLIENT**
- `DELETE /scheduling/jobs/:id` - Delete job (✅ Used)
- `POST /scheduling/jobs/:id/pause` - Pause job (✅ Used)
- `POST /scheduling/jobs/:id/resume` - Resume job (✅ Used)
- `POST /scheduling/jobs/:id/execute` - Trigger job (✅ Used)

**API Client Status:** ⚠️ `updateScheduledJob` method exists but not used
**UI Status:** ⚠️ Can create/delete/pause/resume but cannot edit existing jobs

---

### 9. **Webhooks - Update Feature** (`/api/webhooks`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `GET /webhooks` - List webhooks (✅ Used)
- `POST /webhooks` - Create webhook (✅ Used)
- `PATCH /webhooks/:id` - Update webhook ❌ **NOT USED IN UI**
- `DELETE /webhooks/:id` - Delete webhook (✅ Used)
- `POST /webhooks/:id/test` - Test webhook (✅ Used)
- `GET /webhooks/events/types` - Get event types (✅ Used)

**API Client Status:** ✅ `updateWebhook` method exists
**UI Status:** ❌ No UI to edit existing webhooks

---

### 10. **Localization - Supported Locales** (`/api/localization`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `POST /localization/translate` - Localize content (✅ Used)
- `GET /localization/locales` - Get supported locales ❌ **NOT IN API CLIENT**

**API Client Status:** ⚠️ `getSupportedLocales` method exists but not used
**UI Status:** ⚠️ Hardcoded language list in Settings

---

### 11. **Repurposing - Supported Platforms** (`/api/repurposing`)
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `POST /repurposing/repurpose` - Repurpose content (✅ Used)
- `GET /repurposing/platforms` - Get supported platforms ❌ **NOT IN API CLIENT**

**API Client Status:** ⚠️ `getSupportedPlatforms` method exists but not used
**UI Status:** ⚠️ Hardcoded platform list in Advanced page

---

## 🟡 **PARTIALLY USED (Some Features Missing)**

### 12. **Version Control - Latest Version Endpoint**
**Status:** ⚠️ Backend has `/versions/latest/:projectId` but frontend uses `getProjectVersions` and gets first item

**Backend Endpoint:**
- `GET /versions/latest/:projectId` - Get latest version with content

**API Client Status:** ✅ `getLatestVersion` method exists (just added)
**UI Status:** ✅ Now being used in Editor

---

### 13. **MFA - Full Setup Flow**
**Status:** ⚠️ Partially implemented

**Available Endpoints:**
- `GET /mfa/status` - Get MFA status (✅ Used)
- `POST /mfa/setup` - Setup MFA (✅ Used)
- `POST /mfa/verify-setup` - Verify MFA setup (✅ Used)
- `POST /mfa/disable` - Disable MFA (✅ Used)

**API Client Status:** ✅ All methods exist
**UI Status:** ✅ Now implemented in Settings page

---

## 📊 **Statistics**

### By Category:
- **Templates:** 0% used (0/14 endpoints)
- **Branches:** 40% used (4/10 endpoints)
- **A/B Testing:** 25% used (2/8 endpoints)
- **Subscription:** 20% used (2/10 endpoints)
- **Collaboration:** 70% used (7/10 endpoints)
- **Tone Analysis:** 40% used (2/5 endpoints)
- **Scheduling:** 85% used (6/7 endpoints)
- **Webhooks:** 80% used (4/5 endpoints)

### Overall:
- **Fully Unused:** ~15 major features
- **Partially Used:** ~8 features with missing functionality
- **Total Missing Endpoints:** ~50+ API endpoints not in frontend

---

## 🎯 **Priority Recommendations**

### **HIGH PRIORITY (User-Facing Features):**
1. **Template System UI** - Complete template management interface
2. **Subscription Upgrade/Downgrade** - Add `updateSubscription` to API client and UI
3. **Branch Management UI** - Complete branch management interface
4. **A/B Testing Management UI** - Full A/B test creation and management
5. **Collaboration Invite UI** - Add UI to invite collaborators from projects

### **MEDIUM PRIORITY (Enhancement Features):**
6. **Tone Analysis UI** - Add tone adjustment and targeting features
7. **Template Advanced Features** - Export, import, share, rate templates
8. **Webhook Edit UI** - Allow editing existing webhooks
9. **Scheduled Job Edit UI** - Allow editing existing jobs
10. **Branch Advanced Features** - Switch, rename, compare branches

### **LOW PRIORITY (Nice-to-Have):**
11. **Dynamic Locale/Platform Lists** - Use API instead of hardcoded lists
12. **A/B Testing Performance Tracking** - Track and display metrics
13. **Subscription Billing Dashboard** - Full billing management UI
14. **Quota Checking** - Real-time quota validation before operations

---

## 📝 **Notes**

- Most backend functionality is well-implemented and ready to use
- API client has many methods but they're not connected to UI
- Some features like templates and branches are completely missing from UI
- Subscription management is partially implemented but missing key features
- Collaboration features exist but need better UI integration

