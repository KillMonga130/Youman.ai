/**
 * Multi-Factor Authentication Service
 * Requirements: 74 - MFA with SMS, authenticator app, hardware keys
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import type {
  MfaMethod,
  MfaDevice,
  MfaSetup,
  EnableMfaInput,
  BackupCodesResponse,
  LoginAttemptInfo,
  SuspiciousLoginResult,
  MfaVerificationResult,
  DeviceListResponse,
} from './types';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const SALT_ROUNDS = 10;
const APP_NAME = 'AI Humanizer';

// Suspicious login thresholds
const FAILED_ATTEMPTS_THRESHOLD = 5;
const FAILED_ATTEMPTS_WINDOW_MINUTES = 15;
const NEW_LOCATION_RISK_SCORE = 30;
const NEW_DEVICE_RISK_SCORE = 20;
const MULTIPLE_FAILURES_RISK_SCORE = 40;
const SUSPICIOUS_RISK_THRESHOLD = 50;

/**
 * Enable MFA for a user
 */
export async function enableMfa(
  userId: string,
  input: EnableMfaInput
): Promise<MfaSetup> {
  const { method, name, phoneNumber } = input;

  // Check if user already has this type of device
  const existingDevice = await prisma.mfaDevice.findFirst({
    where: {
      userId,
      type: method,
      isVerified: true,
    },
  });

  if (existingDevice && method !== 'HARDWARE_KEY') {
    throw new MfaError(
      `User already has a verified ${method} device`,
      'DEVICE_EXISTS'
    );
  }

  let secret: string | undefined;
  let qrCodeUrl: string | undefined;

  if (method === 'AUTHENTICATOR') {
    // Generate TOTP secret
    const totpSecret = speakeasy.generateSecret({
      name: APP_NAME,
      length: 32,
    });
    secret = totpSecret.base32;

    // Generate QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: totpSecret.ascii,
      label: APP_NAME,
      issuer: APP_NAME,
    });
    qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
  }

  if (method === 'SMS' && !phoneNumber) {
    throw new MfaError('Phone number is required for SMS MFA', 'PHONE_REQUIRED');
  }

  // Create unverified device
  const device = await prisma.mfaDevice.create({
    data: {
      userId,
      name,
      type: method,
      secret: secret ? await encryptSecret(secret) : null,
      phoneNumber: method === 'SMS' ? phoneNumber : null,
      isVerified: false,
      isPrimary: false,
    },
  });

  logger.info('MFA device created', { userId, deviceId: device.id, method });

  return {
    deviceId: device.id,
    method,
    secret: method === 'AUTHENTICATOR' ? secret : undefined,
    qrCodeUrl,
    phoneNumber: method === 'SMS' ? phoneNumber : undefined,
    verificationRequired: true,
  };
}

/**
 * Verify MFA code and activate device
 */
export async function verifyMfaSetup(
  userId: string,
  deviceId: string,
  code: string
): Promise<MfaVerificationResult> {
  const device = await prisma.mfaDevice.findFirst({
    where: {
      id: deviceId,
      userId,
    },
  });

  if (!device) {
    throw new MfaError('Device not found', 'DEVICE_NOT_FOUND');
  }

  if (device.isVerified) {
    throw new MfaError('Device already verified', 'ALREADY_VERIFIED');
  }

  let verified = false;

  if (device.type === 'AUTHENTICATOR') {
    if (!device.secret) {
      throw new MfaError('Device secret not found', 'SECRET_NOT_FOUND');
    }
    const decryptedSecret = await decryptSecret(device.secret);
    verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
  } else if (device.type === 'SMS') {
    // For SMS, we would verify against a sent code stored in Redis
    // For now, we'll simulate verification
    verified = code.length === 6 && /^\d+$/.test(code);
  }

  if (!verified) {
    throw new MfaError('Invalid verification code', 'INVALID_CODE');
  }

  // Check if this is the first verified device
  const existingVerifiedDevices = await prisma.mfaDevice.count({
    where: {
      userId,
      isVerified: true,
    },
  });

  const isPrimary = existingVerifiedDevices === 0;

  // Mark device as verified
  await prisma.mfaDevice.update({
    where: { id: deviceId },
    data: {
      isVerified: true,
      isPrimary,
      lastUsedAt: new Date(),
    },
  });

  // Enable MFA on user if this is the first device
  if (isPrimary) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
  }

  logger.info('MFA device verified', { userId, deviceId, method: device.type });

  return {
    verified: true,
    deviceId,
    method: device.type as MfaMethod,
  };
}

/**
 * Verify MFA code during login
 */
export async function verifyMfaCode(
  userId: string,
  code: string
): Promise<MfaVerificationResult> {
  // First check if it's a backup code
  const backupResult = await verifyBackupCode(userId, code);
  if (backupResult.verified) {
    return backupResult;
  }

  // Get all verified devices for user
  const devices = await prisma.mfaDevice.findMany({
    where: {
      userId,
      isVerified: true,
    },
    orderBy: {
      isPrimary: 'desc',
    },
  });

  if (devices.length === 0) {
    throw new MfaError('No MFA devices configured', 'NO_DEVICES');
  }

  // Try to verify against each device
  for (const device of devices) {
    if (device.type === 'AUTHENTICATOR' && device.secret) {
      const decryptedSecret = await decryptSecret(device.secret);
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (verified) {
        await prisma.mfaDevice.update({
          where: { id: device.id },
          data: { lastUsedAt: new Date() },
        });

        logger.info('MFA verification successful', {
          userId,
          deviceId: device.id,
          method: device.type,
        });

        return {
          verified: true,
          deviceId: device.id,
          method: device.type as MfaMethod,
        };
      }
    }
  }

  throw new MfaError('Invalid MFA code', 'INVALID_CODE');
}

/**
 * Generate backup codes for a user
 */
export async function generateBackupCodes(
  userId: string
): Promise<BackupCodesResponse> {
  // Delete existing backup codes
  await prisma.mfaBackupCode.deleteMany({
    where: { userId },
  });

  const codes: string[] = [];
  const codeRecords: { userId: string; codeHash: string }[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateRandomCode(BACKUP_CODE_LENGTH);
    codes.push(code);
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    codeRecords.push({ userId, codeHash });
  }

  // Store hashed codes
  await prisma.mfaBackupCode.createMany({
    data: codeRecords,
  });

  logger.info('Backup codes generated', { userId, count: BACKUP_CODE_COUNT });

  return {
    codes,
    generatedAt: new Date(),
  };
}

/**
 * Verify a backup code
 */
async function verifyBackupCode(
  userId: string,
  code: string
): Promise<MfaVerificationResult> {
  const backupCodes = await prisma.mfaBackupCode.findMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  for (const backupCode of backupCodes) {
    const isValid = await bcrypt.compare(code, backupCode.codeHash);
    if (isValid) {
      // Mark code as used
      await prisma.mfaBackupCode.update({
        where: { id: backupCode.id },
        data: { usedAt: new Date() },
      });

      logger.info('Backup code used', { userId, codeId: backupCode.id });

      return {
        verified: true,
        method: 'AUTHENTICATOR', // Backup codes count as authenticator
      };
    }
  }

  return { verified: false };
}

/**
 * Get user's MFA devices
 */
export async function getDevices(userId: string): Promise<DeviceListResponse> {
  const devices = await prisma.mfaDevice.findMany({
    where: {
      userId,
      isVerified: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const backupCodesRemaining = await prisma.mfaBackupCode.count({
    where: {
      userId,
      usedAt: null,
    },
  });

  return {
    devices: devices.map(toMfaDevice),
    backupCodesRemaining,
  };
}

/**
 * Remove an MFA device
 */
export async function removeDevice(
  userId: string,
  deviceId: string
): Promise<void> {
  const device = await prisma.mfaDevice.findFirst({
    where: {
      id: deviceId,
      userId,
    },
  });

  if (!device) {
    throw new MfaError('Device not found', 'DEVICE_NOT_FOUND');
  }

  // Check if this is the last device
  const deviceCount = await prisma.mfaDevice.count({
    where: {
      userId,
      isVerified: true,
    },
  });

  await prisma.mfaDevice.delete({
    where: { id: deviceId },
  });

  // If this was the last device, disable MFA
  if (deviceCount <= 1) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false },
    });

    // Also delete backup codes
    await prisma.mfaBackupCode.deleteMany({
      where: { userId },
    });
  } else if (device.isPrimary) {
    // Set another device as primary
    const nextDevice = await prisma.mfaDevice.findFirst({
      where: {
        userId,
        isVerified: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (nextDevice) {
      await prisma.mfaDevice.update({
        where: { id: nextDevice.id },
        data: { isPrimary: true },
      });
    }
  }

  logger.info('MFA device removed', { userId, deviceId });
}

/**
 * Register a hardware key (WebAuthn)
 */
export async function registerHardwareKey(
  userId: string,
  name: string,
  credentialId: string,
  publicKey: string
): Promise<MfaDevice> {
  const existingVerifiedDevices = await prisma.mfaDevice.count({
    where: {
      userId,
      isVerified: true,
    },
  });

  const isPrimary = existingVerifiedDevices === 0;

  const device = await prisma.mfaDevice.create({
    data: {
      userId,
      name,
      type: 'HARDWARE_KEY',
      credentialId,
      publicKey,
      isVerified: true,
      isPrimary,
    },
  });

  if (isPrimary) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
  }

  logger.info('Hardware key registered', { userId, deviceId: device.id });

  return toMfaDevice(device);
}

/**
 * Record a login attempt for suspicious activity detection
 */
export async function recordLoginAttempt(
  info: LoginAttemptInfo
): Promise<void> {
  const isSuspicious = await checkSuspiciousLogin(info);

  await prisma.loginAttempt.create({
    data: {
      userId: info.userId,
      email: info.email,
      ipAddress: info.ipAddress,
      userAgent: info.userAgent,
      success: info.success,
      failureReason: info.failureReason,
      isSuspicious: isSuspicious.isSuspicious,
      location: info.location,
    },
  });
}

/**
 * Detect suspicious login attempts
 */
export async function detectSuspiciousLogin(
  userId: string,
  ipAddress: string,
  userAgent?: string
): Promise<SuspiciousLoginResult> {
  return checkSuspiciousLogin({
    userId,
    email: '',
    ipAddress,
    userAgent,
    success: false,
  });
}

/**
 * Check if a login attempt is suspicious
 */
async function checkSuspiciousLogin(
  info: LoginAttemptInfo
): Promise<SuspiciousLoginResult> {
  const reasons: string[] = [];
  let riskScore = 0;

  const windowStart = new Date(
    Date.now() - FAILED_ATTEMPTS_WINDOW_MINUTES * 60 * 1000
  );

  // Check for multiple failed attempts from same IP
  const recentFailedAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress: info.ipAddress,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  if (recentFailedAttempts >= FAILED_ATTEMPTS_THRESHOLD) {
    reasons.push('Multiple failed login attempts from this IP');
    riskScore += MULTIPLE_FAILURES_RISK_SCORE;
  }

  // Check for new location (if userId is provided)
  if (info.userId) {
    const previousLogins = await prisma.loginAttempt.findMany({
      where: {
        userId: info.userId,
        success: true,
      },
      select: {
        ipAddress: true,
      },
      distinct: ['ipAddress'],
      take: 10,
    });

    const knownIps = previousLogins.map((l) => l.ipAddress);
    if (knownIps.length > 0 && !knownIps.includes(info.ipAddress)) {
      reasons.push('Login from new IP address');
      riskScore += NEW_LOCATION_RISK_SCORE;
    }

    // Check for new device (user agent)
    if (info.userAgent) {
      const previousDevices = await prisma.loginAttempt.findMany({
        where: {
          userId: info.userId,
          success: true,
          userAgent: { not: null },
        },
        select: {
          userAgent: true,
        },
        distinct: ['userAgent'],
        take: 10,
      });

      const knownAgents = previousDevices
        .map((d) => d.userAgent)
        .filter(Boolean);
      if (knownAgents.length > 0 && !knownAgents.includes(info.userAgent)) {
        reasons.push('Login from new device');
        riskScore += NEW_DEVICE_RISK_SCORE;
      }
    }
  }

  const isSuspicious = riskScore >= SUSPICIOUS_RISK_THRESHOLD;

  return {
    isSuspicious,
    reasons,
    riskScore,
    requiresMfa: isSuspicious,
  };
}

/**
 * Check if user has MFA enabled
 */
export async function isMfaEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });

  return user?.mfaEnabled ?? false;
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
  return prisma.mfaBackupCode.count({
    where: {
      userId,
      usedAt: null,
    },
  });
}

// Helper functions

function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

async function encryptSecret(secret: string): Promise<string> {
  // In production, use proper encryption with a key from env
  // For now, we'll use base64 encoding as a placeholder
  return Buffer.from(secret).toString('base64');
}

async function decryptSecret(encrypted: string): Promise<string> {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

function toMfaDevice(device: {
  id: string;
  userId: string;
  name: string;
  type: string;
  phoneNumber: string | null;
  isVerified: boolean;
  isPrimary: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}): MfaDevice {
  return {
    id: device.id,
    userId: device.userId,
    name: device.name,
    type: device.type as MfaMethod,
    phoneNumber: device.phoneNumber ?? undefined,
    isVerified: device.isVerified,
    isPrimary: device.isPrimary,
    lastUsedAt: device.lastUsedAt,
    createdAt: device.createdAt,
  };
}

/**
 * Custom error class for MFA errors
 */
export class MfaError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MfaError';
    this.code = code;
  }
}
