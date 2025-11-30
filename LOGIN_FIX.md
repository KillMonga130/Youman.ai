# Login Issue Fix

## Problem
Getting 401 Unauthorized when trying to login with `mubvafhimoses813@gmail.com`

## Root Cause
After making `passwordHash` optional for OAuth users, the login function wasn't checking if the user has a password before trying to verify it.

## Fix Applied

### 1. Updated Login Function
Added check for OAuth users (users without passwords):

```typescript
// Check if user has a password (OAuth users don't have passwords)
if (!user.passwordHash) {
  throw new AuthError('This account uses OAuth login. Please sign in with Google or GitHub.', 'OAUTH_ACCOUNT');
}
```

### 2. Updated Seed Script
Added admin user creation to seed script:
- Email: `mubvafhimoses813@gmail.com`
- Password: `admin123456`
- Tier: ENTERPRISE (full access)

### 3. Updated Password Change
Added check to prevent OAuth users from changing password.

## Solution

### Option 1: Run Seed Script (Recommended)
```bash
cd packages/backend
npm run db:seed
```

This will create/update the admin user with password `admin123456`.

### Option 2: Create User Manually
If seed doesn't work, you can create the user directly in the database or via a script.

### Option 3: Use OAuth
Since you're the admin, you can also use OAuth login (Google/GitHub) once it's configured.

## Test Login

After running the seed:
- Email: `mubvafhimoses813@gmail.com`
- Password: `admin123456`

## If Still Not Working

1. **Check database connection**: Make sure PostgreSQL is running
2. **Check user exists**: Run the test script:
   ```bash
   cd packages/backend
   npx tsx scripts/test-login.ts
   ```
3. **Check backend logs**: Look for error messages in the server console
4. **Verify password hash**: The password should be hashed with bcrypt (12 rounds)

## Notes

- Admin email bypasses subscription checks automatically
- OAuth users cannot login with email/password
- Regular users need active subscription to access protected routes

