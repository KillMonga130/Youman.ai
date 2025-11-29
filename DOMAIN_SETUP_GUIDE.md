# Domain Setup Guide: youman.droidver130.com

This guide walks you through setting up the subdomain `youman.droidver130.com` for your AWS Amplify deployment.

## Prerequisites

- ✅ AWS Amplify app deployed
- ✅ Domain `droidver130.com` managed in Squarespace
- ✅ Access to Squarespace DNS settings

## Step-by-Step Instructions

### Step 1: Get Amplify App URL

After deploying to Amplify, you'll have a default URL like:
```
https://main.d12345abcdef.amplifyapp.com
```

Save this URL - you'll need it for the CNAME record.

### Step 2: Configure Domain in AWS Amplify

1. **Open AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Select your "Youman" app

2. **Navigate to Domain Management**
   - In the left sidebar, click **"Domain management"**

3. **Add Domain**
   - Click **"Add domain"** button
   - Enter: `droidver130.com`
   - Click **"Configure domain"**

4. **Configure Subdomain**
   - **Uncheck** the root domain (`droidver130.com`) - Squarespace needs this
   - **Uncheck** the `www` subdomain - we only need `youman`
   - In the subdomain section, type: `youman`
   - Click **"Save"**

5. **Copy CNAME Value**
   - AWS will generate a CNAME record
   - The value will look like: `d12345abcdef.cloudfront.net` or similar
   - **Copy this value** - you'll need it for Squarespace

### Step 3: Configure Squarespace DNS

1. **Log in to Squarespace**
   - Go to [Squarespace](https://www.squarespace.com/)
   - Log in to your account

2. **Navigate to Domain Settings**
   - Go to **Settings** > **Domains**
   - Click on `droidver130.com`

3. **Open DNS Settings**
   - Click **"DNS Settings"** tab
   - Scroll down to **"Custom Records"** section

4. **Add CNAME Record**
   - Click **"Add Record"** button
   - Configure:
     - **Type**: Select `CNAME`
     - **Host**: Enter `youman` (just the subdomain, not the full domain)
     - **Data**: Paste the CNAME value from Amplify (e.g., `d12345abcdef.cloudfront.net`)
   - Click **"Save"**

### Step 4: SSL Certificate (Automatic)

AWS Amplify automatically provisions SSL certificates via AWS Certificate Manager. No action needed on your part.

The certificate will be:
- Automatically issued
- Automatically renewed
- Valid for `youman.droidver130.com`

### Step 5: Wait for DNS Propagation

- **Typical time**: 5-15 minutes
- **Maximum time**: Up to 48 hours (rare)
- **Check status**: Visit `https://youman.droidver130.com`

### Step 6: Verify Setup

1. **Check DNS Resolution**
   ```bash
   nslookup youman.droidver130.com
   ```
   Should return the CloudFront distribution.

2. **Test Website**
   - Visit `https://youman.droidver130.com`
   - Should load your Amplify app

3. **Check SSL Certificate**
   - Click the padlock icon in browser
   - Verify certificate is valid

## Troubleshooting

### Domain Not Resolving

**Issue**: `youman.droidver130.com` doesn't load

**Solutions**:
1. Wait longer (DNS can take up to 48 hours)
2. Verify CNAME record in Squarespace:
   - Host should be: `youman`
   - Data should match Amplify CNAME value
3. Check Amplify domain status:
   - Go to Amplify Console > Domain management
   - Status should be "Active" or "Pending"

### SSL Certificate Issues

**Issue**: Browser shows "Not Secure" or certificate error

**Solutions**:
1. Wait for certificate provisioning (can take 30-60 minutes)
2. Check Amplify domain status - certificate should be "Issued"
3. Clear browser cache and try again
4. Try incognito/private browsing mode

### CNAME Already Exists

**Issue**: Squarespace says CNAME record already exists

**Solutions**:
1. Check existing records in Squarespace DNS
2. Delete the old CNAME record if it's incorrect
3. Add the new CNAME record with correct value

### Wrong CNAME Value

**Issue**: Domain points to wrong location

**Solutions**:
1. Verify CNAME value in Amplify Console
2. Update CNAME record in Squarespace with correct value
3. Wait for DNS propagation

## Additional Notes

### Multiple Environments

If you have staging/production:
- Staging: `staging.youman.droidver130.com` (requires additional CNAME)
- Production: `youman.droidver130.com` (current setup)

### Root Domain

The root domain `droidver130.com` remains with Squarespace. Only the `youman` subdomain points to AWS Amplify.

### www Subdomain

The `www` subdomain is not configured. If needed:
1. Add `www` subdomain in Amplify
2. Add CNAME record in Squarespace: `www` → CloudFront URL

## Quick Reference

**Amplify Console**: https://console.aws.amazon.com/amplify/
**Squarespace DNS**: Settings > Domains > droidver130.com > DNS Settings
**Test URL**: https://youman.droidver130.com

---

**Setup Complete!** ✅

Your subdomain is now configured and pointing to AWS Amplify.

