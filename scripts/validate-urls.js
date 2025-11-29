#!/usr/bin/env node

/**
 * URL Configuration Validator
 * Validates that URL environment variables are configured correctly
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateUrl(url, name) {
  if (!url || url.trim() === '') {
    return { valid: false, error: `${name} is empty` };
  }

  const trimmed = url.trim();
  
  // Check if it's a valid URL format
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: `${name} must start with http:// or https://` };
  }

  // Check if it includes /api/v1 (shouldn't for VITE_API_URL)
  if (name === 'VITE_API_URL' && trimmed.includes('/api/v1')) {
    return { valid: false, error: `${name} should NOT include /api/v1 (it's added automatically)` };
  }

  try {
    new URL(trimmed);
    return { valid: true };
  } catch {
    return { valid: false, error: `${name} is not a valid URL` };
  }
}

function validateCorsOrigins(corsOrigins) {
  if (!corsOrigins || corsOrigins.trim() === '') {
    return { valid: false, error: 'CORS_ORIGINS is empty' };
  }

  const origins = corsOrigins.split(',').map(o => o.trim()).filter(o => o.length > 0);
  
  if (origins.length === 0) {
    return { valid: false, error: 'CORS_ORIGINS has no valid origins' };
  }

  const errors = [];
  origins.forEach((origin, index) => {
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      errors.push(`Origin ${index + 1} (${origin}) must start with http:// or https://`);
    }
    try {
      new URL(origin);
    } catch {
      errors.push(`Origin ${index + 1} (${origin}) is not a valid URL`);
    }
  });

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, origins };
}

function checkEnvFile(filePath, type) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, message: `${type} .env file not found at ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const env = {};

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  });

  return { exists: true, env };
}

function main() {
  log('\n🔍 URL Configuration Validator\n', 'blue');

  // Check frontend
  log('📱 Frontend Configuration:', 'blue');
  const frontendEnvPath = path.join(__dirname, '../packages/frontend/.env.local');
  const frontendEnv = checkEnvFile(frontendEnvPath, 'Frontend');
  
  if (frontendEnv.exists) {
    const viteApiUrl = frontendEnv.env.VITE_API_URL;
    if (viteApiUrl) {
      const validation = validateUrl(viteApiUrl, 'VITE_API_URL');
      if (validation.valid) {
        log('  ✅ VITE_API_URL: ' + viteApiUrl, 'green');
      } else {
        log('  ❌ VITE_API_URL: ' + validation.error, 'red');
        log('     Current value: ' + viteApiUrl, 'yellow');
      }
    } else {
      log('  ⚠️  VITE_API_URL: Not set (will use relative path /api/v1)', 'yellow');
    }
  } else {
    log('  ⚠️  .env.local not found - checking environment variables...', 'yellow');
    const viteApiUrl = process.env.VITE_API_URL;
    if (viteApiUrl) {
      const validation = validateUrl(viteApiUrl, 'VITE_API_URL');
      if (validation.valid) {
        log('  ✅ VITE_API_URL (env): ' + viteApiUrl, 'green');
      } else {
        log('  ❌ VITE_API_URL (env): ' + validation.error, 'red');
      }
    } else {
      log('  ⚠️  VITE_API_URL: Not set (will use relative path /api/v1)', 'yellow');
    }
  }

  // Check backend
  log('\n🔧 Backend Configuration:', 'blue');
  const backendEnvPath = path.join(__dirname, '../packages/backend/.env');
  const backendEnv = checkEnvFile(backendEnvPath, 'Backend');
  
  if (backendEnv.exists) {
    const corsOrigins = backendEnv.env.CORS_ORIGINS;
    if (corsOrigins) {
      const validation = validateCorsOrigins(corsOrigins);
      if (validation.valid) {
        log('  ✅ CORS_ORIGINS: ' + validation.origins.join(', '), 'green');
      } else {
        log('  ❌ CORS_ORIGINS: ' + validation.error, 'red');
        log('     Current value: ' + corsOrigins, 'yellow');
      }
    } else {
      log('  ❌ CORS_ORIGINS: Not set!', 'red');
    }
  } else {
    log('  ⚠️  .env not found - checking environment variables...', 'yellow');
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
      const validation = validateCorsOrigins(corsOrigins);
      if (validation.valid) {
        log('  ✅ CORS_ORIGINS (env): ' + validation.origins.join(', '), 'green');
      } else {
        log('  ❌ CORS_ORIGINS (env): ' + validation.error, 'red');
      }
    } else {
      log('  ❌ CORS_ORIGINS: Not set!', 'red');
    }
  }

  // Summary
  log('\n📋 Quick Reference:', 'blue');
  log('  Frontend: Set VITE_API_URL=https://your-backend.railway.app', 'reset');
  log('  Backend:  Set CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000', 'reset');
  log('\n📚 See URL_QUICK_REFERENCE.md for complete guide\n', 'blue');
}

if (require.main === module) {
  main();
}

module.exports = { validateUrl, validateCorsOrigins };

