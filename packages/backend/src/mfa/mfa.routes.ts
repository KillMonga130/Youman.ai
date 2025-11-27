/**
 * Multi-Factor Authentication Routes
 * Requirements: 74 - MFA with SMS, authenticator app, hardware keys
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/auth.middleware';
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
  MfaError,
} from './mfa.service';
import {
  enableMfaSchema,
  verifyMfaSchema,
  verifyMfaCodeSchema,
  removeDeviceSchema,
  registerHardwareKeySchema,
} from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Enable MFA for the authenticated user
 * POST /mfa/enable
 */
router.post(
  '/enable',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const validatedInput = enableMfaSchema.parse(req.body);

      const setup = await enableMfa(userId, validatedInput);

      res.status(200).json({
        success: true,
        data: setup,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Verify MFA setup with code
 * POST /mfa/verify-setup
 */
router.post(
  '/verify-setup',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { deviceId, code } = verifyMfaSchema.parse(req.body);

      const result = await verifyMfaSetup(userId, deviceId, code);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Verify MFA code during login
 * POST /mfa/verify
 */
router.post(
  '/verify',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { code } = verifyMfaCodeSchema.parse(req.body);

      const result = await verifyMfaCode(userId, code);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate new backup codes
 * POST /mfa/backup-codes
 */
router.post(
  '/backup-codes',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // Check if MFA is enabled
      const mfaEnabled = await isMfaEnabled(userId);
      if (!mfaEnabled) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MFA_NOT_ENABLED',
            message: 'MFA must be enabled before generating backup codes',
          },
        });
        return;
      }

      const codes = await generateBackupCodes(userId);

      res.status(200).json({
        success: true,
        data: codes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get remaining backup codes count
 * GET /mfa/backup-codes/count
 */
router.get(
  '/backup-codes/count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const count = await getBackupCodesCount(userId);

      res.status(200).json({
        success: true,
        data: { remaining: count },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get user's MFA devices
 * GET /mfa/devices
 */
router.get(
  '/devices',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const devices = await getDevices(userId);

      res.status(200).json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Remove an MFA device
 * DELETE /mfa/devices/:deviceId
 */
router.delete(
  '/devices/:deviceId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { deviceId } = removeDeviceSchema.parse({ deviceId: req.params.deviceId });

      await removeDevice(userId, deviceId);

      res.status(200).json({
        success: true,
        message: 'Device removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Register a hardware key (WebAuthn)
 * POST /mfa/hardware-key
 */
router.post(
  '/hardware-key',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { name, credentialId, publicKey } = registerHardwareKeySchema.parse(req.body);

      const device = await registerHardwareKey(userId, name, credentialId, publicKey);

      res.status(200).json({
        success: true,
        data: device,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Check if login is suspicious
 * POST /mfa/check-suspicious
 */
router.post(
  '/check-suspicious',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'];

      const result = await detectSuspiciousLogin(userId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get MFA status for authenticated user
 * GET /mfa/status
 */
router.get(
  '/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const enabled = await isMfaEnabled(userId);
      const devices = await getDevices(userId);

      res.status(200).json({
        success: true,
        data: {
          enabled,
          deviceCount: devices.devices.length,
          backupCodesRemaining: devices.backupCodesRemaining,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Error handler for MFA-specific errors
router.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof MfaError) {
    logger.warn('MFA error', { code: error.code, message: error.message });
    res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: (error as any).errors,
      },
    });
    return;
  }

  next(error);
});

export { router as mfaRoutes };
