/**
 * Cloud Storage Routes
 * API endpoints for Google Drive, Dropbox, and OneDrive integrations
 * 
 * Requirements: 22 - Integrate with cloud storage services
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../auth/auth.middleware';
import {
  CloudProvider,
  connectProviderSchema,
  listFilesSchema,
  importFileSchema,
  exportFileSchema,
  configureSyncSchema,
  disconnectProviderSchema,
} from './types';
import {
  getOAuthUrl,
  connectProvider,
  disconnectProvider,
  getConnectedProviders,
  listFiles,
  importFile,
  exportFile,
  configureSyncForProject,
  syncProject,
  getSyncConfigurations,
  removeSyncConfiguration,
  CloudStorageError,
} from './cloud-storage.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ============================================
// OAuth Routes
// ============================================

/**
 * Get OAuth URL for a provider
 * GET /api/cloud-storage/oauth/:provider
 */
router.get(
  '/oauth/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const provider = req.params.provider.toUpperCase() as CloudProvider;

      if (!Object.values(CloudProvider).includes(provider)) {
        return res.status(400).json({
          error: 'Invalid provider',
          code: 'INVALID_PROVIDER',
        });
      }

      const redirectUri = req.query.redirectUri as string;
      if (!redirectUri) {
        return res.status(400).json({
          error: 'Redirect URI is required',
          code: 'MISSING_REDIRECT_URI',
        });
      }

      const state = uuidv4();
      const result = getOAuthUrl(provider, redirectUri, state);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Connect a cloud provider (exchange code for tokens)
 * POST /api/cloud-storage/connect
 */
router.post(
  '/connect',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const validatedInput = connectProviderSchema.parse(req.body);
      const result = await connectProvider(userId, validatedInput);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Disconnect a cloud provider
 * DELETE /api/cloud-storage/disconnect/:provider
 */
router.delete(
  '/disconnect/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const provider = req.params.provider.toUpperCase() as CloudProvider;

      if (!Object.values(CloudProvider).includes(provider)) {
        return res.status(400).json({
          error: 'Invalid provider',
          code: 'INVALID_PROVIDER',
        });
      }

      await disconnectProvider(userId, provider);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get connected providers
 * GET /api/cloud-storage/connections
 */
router.get(
  '/connections',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const connections = await getConnectedProviders(userId);

      res.json({ connections });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// File Browser Routes
// ============================================

/**
 * List files from cloud storage
 * GET /api/cloud-storage/files/:provider
 * Requirements: 22.2 - Display a file browser showing available documents
 */
router.get(
  '/files/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const provider = req.params.provider.toUpperCase() as CloudProvider;

      if (!Object.values(CloudProvider).includes(provider)) {
        return res.status(400).json({
          error: 'Invalid provider',
          code: 'INVALID_PROVIDER',
        });
      }

      const validatedInput = listFilesSchema.parse({
        provider,
        path: req.query.path,
        folderId: req.query.folderId,
        pageToken: req.query.pageToken,
        pageSize: req.query.pageSize,
      });

      const result = await listFiles(userId, validatedInput);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Import/Export Routes
// ============================================

/**
 * Import a file from cloud storage
 * POST /api/cloud-storage/import
 * Requirements: 22.3 - Import document directly without requiring manual download
 */
router.post(
  '/import',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const validatedInput = importFileSchema.parse(req.body);
      const result = await importFile(userId, validatedInput);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Export a document to cloud storage
 * POST /api/cloud-storage/export
 * Requirements: 22.4 - Save humanized output directly to user's connected cloud account
 */
router.post(
  '/export',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const validatedInput = exportFileSchema.parse(req.body);
      const result = await exportFile(userId, validatedInput);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Sync Routes
// ============================================

/**
 * Configure sync for a project
 * POST /api/cloud-storage/sync/:projectId
 * Requirements: 22.5 - Automatically backup projects to cloud storage
 */
router.post(
  '/sync/:projectId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { projectId } = req.params;

      const validatedInput = configureSyncSchema.parse(req.body);
      const result = await configureSyncForProject(userId, projectId, validatedInput);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Trigger sync for a project
 * POST /api/cloud-storage/sync/:projectId/trigger
 */
router.post(
  '/sync/:projectId/trigger',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { projectId } = req.params;
      const provider = (req.body.provider as string)?.toUpperCase() as CloudProvider;

      if (!Object.values(CloudProvider).includes(provider)) {
        return res.status(400).json({
          error: 'Invalid provider',
          code: 'INVALID_PROVIDER',
        });
      }

      const result = await syncProject(userId, projectId, provider);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get sync configurations
 * GET /api/cloud-storage/sync
 */
router.get(
  '/sync',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const projectId = req.query.projectId as string | undefined;

      const configs = await getSyncConfigurations(userId, projectId);

      res.json({ configurations: configs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Remove sync configuration
 * DELETE /api/cloud-storage/sync/:projectId/:provider
 */
router.delete(
  '/sync/:projectId/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { projectId } = req.params;
      const provider = req.params.provider.toUpperCase() as CloudProvider;

      if (!Object.values(CloudProvider).includes(provider)) {
        return res.status(400).json({
          error: 'Invalid provider',
          code: 'INVALID_PROVIDER',
        });
      }

      await removeSyncConfiguration(userId, projectId, provider);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Error Handler
// ============================================

router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof CloudStorageError) {
    return res.status(getStatusCodeForError(error.code)).json({
      error: error.message,
      code: error.code,
    });
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: (error as any).errors,
    });
  }

  next(error);
});

/**
 * Get HTTP status code for error code
 */
function getStatusCodeForError(code: string): number {
  const statusCodes: Record<string, number> = {
    UNSUPPORTED_PROVIDER: 400,
    INVALID_PROVIDER: 400,
    MISSING_REDIRECT_URI: 400,
    VALIDATION_ERROR: 400,
    TOKEN_EXCHANGE_FAILED: 401,
    TOKEN_REFRESH_FAILED: 401,
    USER_INFO_FAILED: 401,
    CONNECTION_NOT_FOUND: 404,
    PROJECT_NOT_FOUND: 404,
    DOCUMENT_NOT_FOUND: 404,
    FOLDER_NOT_FOUND: 404,
    SYNC_CONFIG_NOT_FOUND: 404,
    LIST_FILES_FAILED: 500,
    DOWNLOAD_FAILED: 500,
    UPLOAD_FAILED: 500,
  };

  return statusCodes[code] || 500;
}

export { router as cloudStorageRouter };
