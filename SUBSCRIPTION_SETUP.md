# Subscription & OAuth Setup Guide

This guide will help you complete the setup for Paystack subscriptions, OAuth authentication, and subscription enforcement.

## ✅ Completed

- ✅ Paystack integration (replaced Stripe)
- ✅ OAuth authentication (Google & GitHub)
- ✅ Subscription enforcement middleware
- ✅ Admin bypass for `mubvafhimoses813@gmail.com`
- ✅ Cloud connections UI in Settings

## 📋 Next Steps

### 1. Database Migration

Run the Prisma migration to update your database schema:

```bash
cd packages/backend
npx prisma migrate dev --name add_paystack_oauth
```

Or if you prefer to push the schema directly:

```bash
npx prisma db push
```

This will:
- Make `passwordHash` optional (for OAuth users)
- Add OAuth fields to User model
- Replace Stripe fields with Paystack fields in Subscription model

### 2. Environment Variables

Add these to your `.env` file in `packages/backend/`:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here

# Paystack Plan Codes (get these from Paystack dashboard after creating plans)
PAYSTACK_BASIC_PLAN_CODE=PLN_xxxxx
PAYSTACK_PROFESSIONAL_PLAN_CODE=PLN_xxxxx
PAYSTACK_ENTERPRISE_PLAN_CODE=PLN_xxxxx

# OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GITHUB_OAUTH_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret
```

### 3. Paystack Setup

1. **Create a Paystack account** at https://paystack.com
2. **Get your API keys** from the Settings → API Keys & Webhooks section
3. **Create subscription plans**:
   - Go to Settings → Plans
   - Create plans for BASIC, PROFESSIONAL, and ENTERPRISE tiers
   - Copy the plan codes (they start with `PLN_`)
   - Update `PAYSTACK_*_PLAN_CODE` in your `.env`
4. **Set up webhook**:
   - Go to Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/v1/subscription/webhook`
   - Copy the webhook secret to `PAYSTACK_WEBHOOK_SECRET`

### 4. Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create a new project** or select existing
3. **Enable Google+ API**:
   - APIs & Services → Library
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/login` (development)
     - `https://yourdomain.com/login` (production)
5. **Copy Client ID and Secret** to your `.env`

### 5. GitHub OAuth Setup

1. **Go to GitHub Settings**: https://github.com/settings/developers
2. **Create a new OAuth App**:
   - Click "New OAuth App"
   - Application name: Your App Name
   - Homepage URL: Your website URL
   - Authorization callback URL:
     - `http://localhost:3000/login` (development)
     - `https://yourdomain.com/login` (production)
3. **Copy Client ID and Secret** to your `.env`

### 6. Subscription Enforcement

Subscription middleware has been applied to these routes:
- `/api/v1/projects` - Project management
- `/api/v1/versions` - Version control
- `/api/v1/branches` - Branching
- `/api/v1/storage` - File storage
- `/api/v1/collaboration` - Team collaboration
- `/api/v1/transformations` - Text humanization
- `/api/v1/detection` - AI detection
- `/api/v1/templates` - Templates

**Admin bypass**: The email `mubvafhimoses813@gmail.com` bypasses all subscription checks.

### 7. Testing

1. **Test OAuth login**:
   - Go to `/login`
   - Click "Google" or "GitHub" button
   - Complete OAuth flow
   - Should redirect back and log you in

2. **Test subscription enforcement**:
   - Create a test user (not admin)
   - Try accessing protected routes
   - Should get 403 if no active subscription
   - Admin email should bypass all checks

3. **Test Paystack webhook**:
   - Use Paystack's webhook testing tool
   - Or use ngrok to expose local server
   - Verify webhook signature validation works

### 8. Tier-Based Features

To restrict features by tier, use the `requireTier` middleware:

```typescript
import { requireTier } from '../subscription/subscription.middleware';
import { SubscriptionTier } from '../subscription/types';

// Require PROFESSIONAL tier or higher
router.post('/advanced-feature', requireTier(SubscriptionTier.PROFESSIONAL), handler);
```

### 9. Frontend Integration

The frontend is already set up with:
- OAuth login buttons on Login page
- Subscription hooks in `api/hooks.ts`
- Cloud connections UI in Settings page

Make sure to update the API client base URL if needed.

## 🔒 Security Notes

1. **Never commit `.env` files** to version control
2. **Use different keys** for development and production
3. **Rotate secrets** regularly
4. **Monitor webhook logs** for suspicious activity
5. **Admin email** is hardcoded - consider moving to environment variable for production

## 📝 Additional Configuration

### Custom Tier Limits

Edit `packages/backend/src/subscription/types.ts` to customize tier limits:

```typescript
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  // Customize limits here
};
```

### Subscription Status Handling

The system handles these subscription statuses:
- `ACTIVE` - Full access
- `PAST_DUE` - Limited access (handled by middleware)
- `CANCELED` - No access
- `PAUSED` - No access

## 🆘 Troubleshooting

### OAuth not working?
- Check redirect URIs match exactly
- Verify client ID/secret are correct
- Check browser console for errors

### Paystack webhook failing?
- Verify webhook secret matches
- Check webhook URL is accessible
- Review server logs for signature validation errors

### Subscription check failing?
- Verify user has a subscription record
- Check subscription status is ACTIVE
- Review middleware logs

## 🎉 You're All Set!

Once you've completed these steps, your subscription system is ready to go. Users will need an active subscription to access protected features, except for the admin email.

