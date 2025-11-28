# AI Humanizer Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the AI Humanizer.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Transformation Issues](#transformation-issues)
3. [Detection Score Issues](#detection-score-issues)
4. [Performance Issues](#performance-issues)
5. [API Issues](#api-issues)
6. [Integration Issues](#integration-issues)
7. [Account & Billing Issues](#account--billing-issues)
8. [Error Code Reference](#error-code-reference)

---

## Authentication Issues

### "Invalid credentials" Error

**Symptoms**: Login fails with "Invalid credentials" message.

**Solutions**:
1. Verify email and password are correct
2. Check for extra spaces in email/password
3. Ensure Caps Lock is off
4. Try "Forgot Password" to reset

### "Token expired" Error

**Symptoms**: API calls fail with 401 status after working previously.

**Solutions**:
1. Refresh your access token using the refresh token
2. If refresh token is also expired, login again
3. Implement automatic token refresh in your code:

```javascript
async function refreshTokenIfNeeded() {
  if (isTokenExpired(accessToken)) {
    const { tokens } = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }).then(r => r.json());
    
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  }
}
```

### "Session not found" Error

**Symptoms**: Authenticated requests fail with session errors.

**Solutions**:
1. Your session may have been invalidated (logout from another device)
2. Login again to create a new session
3. Check if you're using the correct token

### MFA Issues

**Symptoms**: Can't complete MFA verification.

**Solutions**:
1. Ensure your device time is synchronized (TOTP codes are time-sensitive)
2. Use backup codes if authenticator app isn't working
3. Contact support to reset MFA if locked out

---

## Transformation Issues

### Transformation Takes Too Long

**Symptoms**: Processing seems stuck or takes longer than expected.

**Expected Processing Times**:
| Document Size | Expected Time |
|---------------|---------------|
| < 1,000 words | < 5 seconds |
| 1,000-10,000 words | 5-30 seconds |
| 10,000-50,000 words | 30 seconds - 3 minutes |
| 50,000-100,000 words | 3-10 minutes |
| > 100,000 words | 10+ minutes |

**Solutions**:
1. Check progress updates - processing may still be running
2. For very large documents, use async processing
3. Split extremely large documents into smaller parts
4. Check your internet connection

### "Text too long" Error

**Symptoms**: Error when submitting large documents.

**Solutions**:
1. Maximum input is 500,000 words (~2MB of text)
2. Split document into smaller sections
3. Remove unnecessary content before processing

### "Empty input" Error

**Symptoms**: Error when submitting text.

**Solutions**:
1. Ensure text is not empty or whitespace-only
2. Check for encoding issues in your text
3. Verify the text field is being sent correctly

### Protected Segments Not Working

**Symptoms**: Text within delimiters is being modified.

**Solutions**:
1. Verify delimiter syntax is correct: `[[protected text]]`
2. Ensure delimiters are properly closed
3. Check for nested delimiters (not supported)
4. Use custom delimiters if default conflicts with your content:

```json
{
  "protectedDelimiters": [
    { "open": "{!", "close": "!}" }
  ]
}
```

### Meaning Changed After Transformation

**Symptoms**: Humanized text has different meaning than original.

**Solutions**:
1. Lower the humanization level (try level 1-2)
2. Protect critical phrases using delimiters
3. Use the comparison view to identify problematic changes
4. Accept/reject individual changes in the editor

---

## Detection Score Issues

### High Detection Scores After Transformation

**Symptoms**: AI detection scores remain high (>30%) after humanization.

**Solutions**:
1. **Increase humanization level**: Try level 4 or 5
2. **Change strategy**: Different strategies work better for different content
3. **Re-process specific sections**: Target high-scoring paragraphs
4. **Add manual edits**: Personal touches help reduce scores
5. **Check for patterns**: Repetitive structures can trigger detectors

### Inconsistent Detection Scores

**Symptoms**: Different detectors give very different scores.

**Explanation**: Each detector uses different algorithms and training data.

**Solutions**:
1. Focus on the average score across all detectors
2. Prioritize the detector most relevant to your use case
3. Re-process if any single detector shows very high scores

### Detection Test Timeout

**Symptoms**: Detection tests fail or timeout.

**Solutions**:
1. Detection tests have a 15-second timeout
2. Try again - external services may be temporarily slow
3. Use internal detection as fallback
4. Check API status page for service issues

---

## Performance Issues

### Slow Page Loading

**Symptoms**: Dashboard or editor loads slowly.

**Solutions**:
1. Clear browser cache and cookies
2. Disable browser extensions temporarily
3. Try a different browser
4. Check your internet connection speed
5. Reduce the number of projects displayed (use filters)

### Editor Lag

**Symptoms**: Typing or editing feels slow.

**Solutions**:
1. For very large documents, use the "Focus Mode" to edit sections
2. Disable real-time collaboration if not needed
3. Close other browser tabs
4. Use a modern browser (Chrome, Firefox, Edge)

### Memory Issues

**Symptoms**: Browser becomes unresponsive with large documents.

**Solutions**:
1. The system automatically chunks large documents
2. Close other applications to free memory
3. Use the desktop app for very large documents
4. Split document into smaller projects

---

## API Issues

### Rate Limit Exceeded (429 Error)

**Symptoms**: API returns 429 status code.

**Solutions**:
1. Check `Retry-After` header for wait time
2. Implement exponential backoff:

```javascript
async function withBackoff(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status !== 429 || i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

3. Upgrade your subscription for higher limits
4. Batch requests to reduce API calls

### Quota Exceeded

**Symptoms**: API returns quota exceeded error.

**Solutions**:
1. Check your usage in the dashboard
2. Wait for monthly quota reset
3. Upgrade your subscription tier
4. Purchase additional quota (Enterprise plans)

### Connection Timeout

**Symptoms**: API requests timeout.

**Solutions**:
1. Increase timeout settings in your client
2. Check your network connection
3. For large documents, use async processing
4. Check API status page

### Invalid JSON Response

**Symptoms**: API returns malformed JSON.

**Solutions**:
1. Check your request headers (`Content-Type: application/json`)
2. Verify request body is valid JSON
3. Check for encoding issues
4. Report to support with request ID

---

## Integration Issues

### Webhook Not Receiving Events

**Symptoms**: Registered webhooks don't receive events.

**Solutions**:
1. Verify webhook URL is publicly accessible
2. Check webhook is registered for correct events
3. Verify your server returns 200 status quickly
4. Check webhook logs in dashboard
5. Test with a service like webhook.site

### Webhook Signature Verification Failing

**Symptoms**: HMAC signature doesn't match.

**Solutions**:
1. Use the raw request body (not parsed JSON)
2. Ensure you're using the correct secret
3. Check for encoding issues:

```javascript
const crypto = require('crypto');

function verifySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

### Cloud Storage Connection Failed

**Symptoms**: Can't connect to Google Drive/Dropbox/OneDrive.

**Solutions**:
1. Re-authorize the connection in Settings
2. Check if third-party cookies are enabled
3. Verify your cloud storage account is active
4. Try disconnecting and reconnecting

---

## Account & Billing Issues

### Can't Upgrade Subscription

**Symptoms**: Upgrade button doesn't work or payment fails.

**Solutions**:
1. Verify payment method is valid
2. Check for sufficient funds
3. Try a different payment method
4. Contact your bank if card is declined
5. Contact support for assistance

### Usage Not Updating

**Symptoms**: Dashboard shows incorrect usage.

**Solutions**:
1. Usage updates may have a short delay (up to 5 minutes)
2. Refresh the page
3. Check usage via API for real-time data
4. Contact support if discrepancy persists

### Invoice Not Received

**Symptoms**: Didn't receive invoice email.

**Solutions**:
1. Check spam/junk folder
2. Verify email address in account settings
3. Download invoices from billing dashboard
4. Contact support for invoice copies

---

## Error Code Reference

### Client Errors (4xx)

| Code | HTTP | Description | Solution |
|------|------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters | Check request body against API docs |
| `UNAUTHORIZED` | 401 | Missing/invalid authentication | Login or refresh token |
| `FORBIDDEN` | 403 | Insufficient permissions | Check user role/permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify resource ID |
| `CONFLICT` | 409 | Resource conflict | Check for duplicates |
| `RATE_LIMITED` | 429 | Too many requests | Wait and retry |
| `QUOTA_EXCEEDED` | 429 | Usage quota exceeded | Upgrade plan or wait for reset |

### Server Errors (5xx)

| Code | HTTP | Description | Solution |
|------|------|-------------|----------|
| `INTERNAL_ERROR` | 500 | Server error | Retry, contact support if persists |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down | Check status page, retry later |
| `GATEWAY_TIMEOUT` | 504 | Request timeout | Retry with smaller payload |

### Transformation Errors

| Code | Description | Solution |
|------|-------------|----------|
| `TEXT_TOO_LONG` | Input exceeds maximum | Split into smaller parts |
| `TEXT_EMPTY` | No text provided | Provide non-empty text |
| `INVALID_LEVEL` | Level not 1-5 | Use level between 1 and 5 |
| `INVALID_STRATEGY` | Unknown strategy | Use: casual, professional, academic, auto |
| `LANGUAGE_NOT_SUPPORTED` | Language not supported | Use supported language |
| `PROCESSING_FAILED` | Transformation failed | Retry, contact support if persists |

---

## Getting Help

If you can't resolve your issue:

1. **Check Status Page**: status.aihumanizer.com
2. **Search Knowledge Base**: help.aihumanizer.com
3. **Community Forum**: community.aihumanizer.com
4. **Email Support**: support@aihumanizer.com
5. **Live Chat**: Available in-app during business hours

When contacting support, include:
- Your account email
- Request ID (from error response)
- Steps to reproduce the issue
- Screenshots if applicable
- Browser/SDK version
