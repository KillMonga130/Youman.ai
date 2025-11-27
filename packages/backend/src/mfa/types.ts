/**
 * Multi-Factor Authentication Types
 * Requirements: 74 - MFA with SMS, authenticator app, hardware keys
 */

import { z } from 'zod';

// MFA Method types
export type MfaMethod = 'SMS' | 'AUTHENTICATOR' | 'HARDWARE_KEY';

// MFA Device interface
export interface MfaDevice {
  id: string;
  userId: string;
  name: string;
  type: MfaMethod;
  phoneNumber?: string;
  isVerified: boolean;
  isPrimary: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// MFA Setup response
export interface MfaSetup {
  deviceId: string;
  method: MfaMethod;
  secret?: string;
  qrCodeUrl?: string;
  phoneNumber?: string;
  verificationRequired: boolean;
}

// Validation schemas
export const enableMfaSchema = z.object({
  method: z.enum(['SMS', 'AUTHENTICATOR', 'HARDWARE_KEY']),
  name: z.string().min(1, 'Device name is required').max(100),
  phoneNumber: z.string().optional(),
});

export const verifyMfaSchema = z.object({
  deviceId: z.string().uuid(),
  code: z.string().min(6).max(8),
});

export const verifyMfaCodeSchema = z.object({
  code: z.string().min(6).max(8),
});

export const removeDeviceSchema = z.object({
  deviceId: z.string().uuid(),
});

export const registerHardwareKeySchema = z.object({
  name: z.string().min(1).max(100),
  credentialId: z.string(),
  publicKey: z.string(),
});

// Types derived from schemas
export type EnableMfaInput = z.infer<typeof enableMfaSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
export type VerifyMfaCodeInput = z.infer<typeof verifyMfaCodeSchema>;
export type RemoveDeviceInput = z.infer<typeof removeDeviceSchema>;
export type RegisterHardwareKeyInput = z.infer<typeof registerHardwareKeySchema>;

// Backup codes
export interface BackupCodesResponse {
  codes: string[];
  generatedAt: Date;
}

// Login attempt for suspicious detection
export interface LoginAttemptInfo {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  location?: string;
}

// Suspicious login detection result
export interface SuspiciousLoginResult {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number;
  requiresMfa: boolean;
}

// MFA verification result
export interface MfaVerificationResult {
  verified: boolean;
  deviceId?: string;
  method?: MfaMethod;
}

// Device management
export interface DeviceListResponse {
  devices: MfaDevice[];
  backupCodesRemaining: number;
}
