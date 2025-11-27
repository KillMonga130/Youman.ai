/**
 * MFA Service Tests
 * Requirements: 74 - Multi-factor authentication with SMS, authenticator app, hardware keys
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import speakeasy from 'speakeasy';
import {
  enableMfa,
  verifyMfaSetup,
  verifyMfaCode,
  generateBackupCodes,
  getDevices,
  removeDevice,
  registerHardwareKey,
  detectSuspiciousLogin,
  isMfaEnabled,
  getBackupCodesCount,
  recordLoginAttempt,
  MfaError,
} from './mfa.service';
import { prisma } from '../database/prisma';

// Mock prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    mfaDevice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    mfaBackupCode: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    loginAttempt: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('MFA Service', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('enableMfa', () => {
    it('should enable AUTHENTICATOR MFA and return setup data', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.mfaDevice.create).mockResolvedValue({
        id: 'device-123',
        userId: mockUserId,
        name: 'My Authenticator',
        type: 'AUTHENTICATOR',
        secret: 'encrypted-secret',
        phoneNumber: null,
        credentialId: null,
        publicKey: null,
        counter: 0,
        isVerified: false,
        isPrimary: false,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await enableMfa(mockUserId, {
        method: 'AUTHENTICATOR',
        name: 'My Authenticator',
      });

      expect(result.deviceId).toBe('device-123');
      expect(result.method).toBe('AUTHENTICATOR');
      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.verificationRequired).toBe(true);
    });

    it('should enable SMS MFA with phone number', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.mfaDevice.create).mockResolvedValue({
        id: 'device-456',
        userId: mockUserId,
        name: 'My Phone',
        type: 'SMS',
        secret: null,
        phoneNumber: '+1234567890',
        credentialId: null,
        publicKey: null,
        counter: 0,
        isVerified: false,
        isPrimary: false,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await enableMfa(mockUserId, {
        method: 'SMS',
        name: 'My Phone',
        phoneNumber: '+1234567890',
      });

      expect(result.deviceId).toBe('device-456');
      expect(result.method).toBe('SMS');
      expect(result.phoneNumber).toBe('+1234567890');
    });

    it('should throw error if SMS MFA without phone number', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue(null);

      await expect(
        enableMfa(mockUserId, {
          method: 'SMS',
          name: 'My Phone',
        })
      ).rejects.toThrow(MfaError);
    });

    it('should throw error if device already exists', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue({
        id: 'existing-device',
        userId: mockUserId,
        name: 'Existing',
        type: 'AUTHENTICATOR',
        secret: 'secret',
        phoneNumber: null,
        credentialId: null,
        publicKey: null,
        counter: 0,
        isVerified: true,
        isPrimary: true,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        enableMfa(mockUserId, {
          method: 'AUTHENTICATOR',
          name: 'New Authenticator',
        })
      ).rejects.toThrow(MfaError);
    });
  });

  describe('verifyMfaSetup', () => {
    it('should verify TOTP code and activate device', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue({
        id: 'device-123',
        userId: mockUserId,
        name: 'My Authenticator',
        type: 'AUTHENTICATOR',
        secret: Buffer.from(secret.base32).toString('base64'),
        phoneNumber: null,
        credentialId: null,
        publicKey: null,
        counter: 0,
        isVerified: false,
        isPrimary: false,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.mfaDevice.count).mockResolvedValue(0);
      vi.mocked(prisma.mfaDevice.update).mockResolvedValue({} as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await verifyMfaSetup(mockUserId, 'device-123', validCode);

      expect(result.verified).toBe(true);
      expect(result.deviceId).toBe('device-123');
      expect(result.method).toBe('AUTHENTICATOR');
    });

    it('should throw error for invalid code', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });

      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue({
        id: 'device-123',
        userId: mockUserId,
        name: 'My Authenticator',
        type: 'AUTHENTICATOR',
        secret: Buffer.from(secret.base32).toString('base64'),
        phoneNumber: null,
        credentialId: null,
        publicKey: null,
        counter: 0,
        isVerified: false,
        isPrimary: false,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        verifyMfaSetup(mockUserId, 'device-123', '000000')
      ).rejects.toThrow(MfaError);
    });

    it('should throw error if device not found', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue(null);

      await expect(
        verifyMfaSetup(mockUserId, 'nonexistent', '123456')
      ).rejects.toThrow(MfaError);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      vi.mocked(prisma.mfaBackupCode.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.mfaBackupCode.createMany).mockResolvedValue({ count: 10 });

      const result = await generateBackupCodes(mockUserId);

      expect(result.codes).toHaveLength(10);
      expect(result.codes.every((code) => code.length === 8)).toBe(true);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getDevices', () => {
    it('should return user devices and backup codes count', async () => {
      vi.mocked(prisma.mfaDevice.findMany).mockResolvedValue([
        {
          id: 'device-1',
          userId: mockUserId,
          name: 'Authenticator',
          type: 'AUTHENTICATOR',
          secret: 'secret',
          phoneNumber: null,
          credentialId: null,
          publicKey: null,
          counter: 0,
          isVerified: true,
          isPrimary: true,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(prisma.mfaBackupCode.count).mockResolvedValue(8);

      const result = await getDevices(mockUserId);

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].name).toBe('Authenticator');
      expect(result.backupCodesRemaining).toBe(8);
    });
  });

  describe('removeDevice', () => {
    it('should remove device and disable MFA if last device', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue({
        id: 'device-123',
        userId: mockUserId,
        name: 'Authenticator',
        type: 'AUTHENTICATOR',
        secret: 'secret',
        phoneNumber: null,
        credentialId: null,
        publicKey: null,
        counter: 0,
        isVerified: true,
        isPrimary: true,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.mfaDevice.count).mockResolvedValue(1);
      vi.mocked(prisma.mfaDevice.delete).mockResolvedValue({} as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.mfaBackupCode.deleteMany).mockResolvedValue({ count: 0 });

      await removeDevice(mockUserId, 'device-123');

      expect(prisma.mfaDevice.delete).toHaveBeenCalledWith({
        where: { id: 'device-123' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { mfaEnabled: false },
      });
    });

    it('should throw error if device not found', async () => {
      vi.mocked(prisma.mfaDevice.findFirst).mockResolvedValue(null);

      await expect(removeDevice(mockUserId, 'nonexistent')).rejects.toThrow(
        MfaError
      );
    });
  });

  describe('registerHardwareKey', () => {
    it('should register hardware key and enable MFA', async () => {
      vi.mocked(prisma.mfaDevice.count).mockResolvedValue(0);
      vi.mocked(prisma.mfaDevice.create).mockResolvedValue({
        id: 'hw-key-123',
        userId: mockUserId,
        name: 'YubiKey',
        type: 'HARDWARE_KEY',
        secret: null,
        phoneNumber: null,
        credentialId: 'cred-id',
        publicKey: 'pub-key',
        counter: 0,
        isVerified: true,
        isPrimary: true,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await registerHardwareKey(
        mockUserId,
        'YubiKey',
        'cred-id',
        'pub-key'
      );

      expect(result.id).toBe('hw-key-123');
      expect(result.type).toBe('HARDWARE_KEY');
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('detectSuspiciousLogin', () => {
    it('should detect suspicious login from new IP with failed attempts', async () => {
      vi.mocked(prisma.loginAttempt.count).mockResolvedValue(6);
      vi.mocked(prisma.loginAttempt.findMany).mockResolvedValue([
        { ipAddress: '192.168.1.1', userAgent: 'Chrome' },
      ] as any);

      const result = await detectSuspiciousLogin(
        mockUserId,
        '10.0.0.1',
        'Firefox'
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should not flag normal login from known IP', async () => {
      vi.mocked(prisma.loginAttempt.count).mockResolvedValue(0);
      vi.mocked(prisma.loginAttempt.findMany).mockResolvedValue([
        { ipAddress: '192.168.1.1', userAgent: 'Chrome' },
      ] as any);

      const result = await detectSuspiciousLogin(
        mockUserId,
        '192.168.1.1',
        'Chrome'
      );

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBe(0);
    });
  });

  describe('isMfaEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        mfaEnabled: true,
      } as any);

      const result = await isMfaEnabled(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false if MFA is disabled', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        mfaEnabled: false,
      } as any);

      const result = await isMfaEnabled(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getBackupCodesCount', () => {
    it('should return count of unused backup codes', async () => {
      vi.mocked(prisma.mfaBackupCode.count).mockResolvedValue(7);

      const result = await getBackupCodesCount(mockUserId);

      expect(result).toBe(7);
    });
  });

  describe('recordLoginAttempt', () => {
    it('should record login attempt', async () => {
      vi.mocked(prisma.loginAttempt.count).mockResolvedValue(0);
      vi.mocked(prisma.loginAttempt.findMany).mockResolvedValue([]);
      vi.mocked(prisma.loginAttempt.create).mockResolvedValue({} as any);

      await recordLoginAttempt({
        userId: mockUserId,
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        success: true,
      });

      expect(prisma.loginAttempt.create).toHaveBeenCalled();
    });
  });
});
