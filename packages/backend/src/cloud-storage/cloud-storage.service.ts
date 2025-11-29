/**
 * Cloud Storage Service
 * Handles Google Drive, Dropbox, and OneDrive integrations
 * 
 * Requirements: 22 - Integrate with cloud storage services
 */

import { google, drive_v3 } from 'googleapis';
import { Dropbox } from 'dropbox';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { storeDocument, retrieveDocument } from '../storage/storage.service';
import { DocumentModel } from '../database/schemas/document.schema';
import {
  CloudProvider,
  CloudFileType,
  SyncStatus,
  type OAuth2Credentials,
  type OAuth2TokenResponse,
  type CloudConnection,
  type CloudFile,
  type CloudFileListResponse,
  type ImportFileResult,
  type ExportFileResult,
  type ProjectSyncConfig,
  type SyncResult,
  type ConnectProviderInput,
  type ListFilesInput,
  type ImportFileInput,
  type ExportFileInput,
  type ConfigureSyncInput,
  type CloudConnectionResponse,
  type OAuthUrlResponse,
} from './types';

// ============================================
// Configuration
// ============================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID || '';
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET || '';
const ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID || '';
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET || '';

// ============================================
// Error Classes
// ============================================

export class CloudStorageError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CloudStorageError';
    this.code = code;
  }
}

// ============================================
// OAuth Response Types
// ============================================

interface OAuthTokenData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface OneDriveUserInfo {
  mail?: string;
  userPrincipalName?: string;
  displayName?: string;
}

interface OneDriveFileListResponse {
  value?: OneDriveFileItem[];
  '@odata.nextLink'?: string;
}

interface OneDriveFileItem {
  id: string;
  name: string;
  size?: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl?: string;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  parentReference?: { path?: string; id?: string };
  '@microsoft.graph.downloadUrl'?: string;
  thumbnails?: Array<{ medium?: { url?: string } }>;
  shared?: boolean;
}

// ============================================
// OAuth Helper Functions
// ============================================

/**
 * Create Google OAuth2 client
 */
function createGoogleOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/**
 * Get OAuth URL for a provider
 * Requirements: 22.1 - Support integration with Google Drive, Dropbox, and OneDrive
 */
export function getOAuthUrl(
  provider: CloudProvider,
  redirectUri: string,
  state: string
): OAuthUrlResponse {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE: {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new CloudStorageError(
          'Google Drive OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
          'OAUTH_NOT_CONFIGURED'
        );
      }
      const oauth2Client = createGoogleOAuth2Client(redirectUri);
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        state,
        prompt: 'consent',
      });
      return { url, state };
    }

    case CloudProvider.DROPBOX: {
      if (!DROPBOX_CLIENT_ID || !DROPBOX_CLIENT_SECRET) {
        throw new CloudStorageError(
          'Dropbox OAuth is not configured. Please set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET environment variables.',
          'OAUTH_NOT_CONFIGURED'
        );
      }
      const url = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&token_access_type=offline`;
      return { url, state };
    }

    case CloudProvider.ONEDRIVE: {
      if (!ONEDRIVE_CLIENT_ID || !ONEDRIVE_CLIENT_SECRET) {
        throw new CloudStorageError(
          'OneDrive OAuth is not configured. Please set ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET environment variables.',
          'OAUTH_NOT_CONFIGURED'
        );
      }
      const scope = encodeURIComponent('files.readwrite.all offline_access user.read');
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${ONEDRIVE_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
      return { url, state };
    }

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  provider: CloudProvider,
  code: string,
  redirectUri: string
): Promise<OAuth2TokenResponse> {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE: {
      const oauth2Client = createGoogleOAuth2Client(redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      return {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : undefined,
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || undefined,
      };
    }

    case CloudProvider.DROPBOX: {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: DROPBOX_CLIENT_ID,
          client_secret: DROPBOX_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new CloudStorageError('Failed to exchange Dropbox code', 'TOKEN_EXCHANGE_FAILED');
      }

      const data = await response.json() as OAuthTokenData;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
      };
    }

    case CloudProvider.ONEDRIVE: {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: ONEDRIVE_CLIENT_ID,
          client_secret: ONEDRIVE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          scope: 'files.readwrite.all offline_access user.read',
        }),
      });

      if (!response.ok) {
        throw new CloudStorageError('Failed to exchange OneDrive code', 'TOKEN_EXCHANGE_FAILED');
      }

      const data = await response.json() as OAuthTokenData;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
      };
    }

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(
  provider: CloudProvider,
  refreshToken: string
): Promise<OAuth2TokenResponse> {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE: {
      const oauth2Client = createGoogleOAuth2Client('');
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      return {
        accessToken: credentials.access_token || '',
        refreshToken: credentials.refresh_token || refreshToken,
        expiresIn: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : undefined,
        tokenType: credentials.token_type || 'Bearer',
      };
    }

    case CloudProvider.DROPBOX: {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: DROPBOX_CLIENT_ID,
          client_secret: DROPBOX_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new CloudStorageError('Failed to refresh Dropbox token', 'TOKEN_REFRESH_FAILED');
      }

      const data = await response.json() as OAuthTokenData;
      return {
        accessToken: data.access_token,
        refreshToken: refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
      };
    }

    case CloudProvider.ONEDRIVE: {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: ONEDRIVE_CLIENT_ID,
          client_secret: ONEDRIVE_CLIENT_SECRET,
          scope: 'files.readwrite.all offline_access user.read',
        }),
      });

      if (!response.ok) {
        throw new CloudStorageError('Failed to refresh OneDrive token', 'TOKEN_REFRESH_FAILED');
      }

      const data = await response.json() as OAuthTokenData;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
      };
    }

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Get user info from provider
 */
async function getUserInfo(
  provider: CloudProvider,
  accessToken: string
): Promise<{ email: string; displayName?: string }> {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE: {
      const oauth2Client = createGoogleOAuth2Client('');
      oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();
      return {
        email: data.email || '',
        displayName: data.name || undefined,
      };
    }

    case CloudProvider.DROPBOX: {
      const dbx = new Dropbox({ accessToken });
      const response = await dbx.usersGetCurrentAccount();
      return {
        email: response.result.email,
        displayName: response.result.name.display_name,
      };
    }

    case CloudProvider.ONEDRIVE: {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new CloudStorageError('Failed to get OneDrive user info', 'USER_INFO_FAILED');
      }

      const data = await response.json() as OneDriveUserInfo;
      return {
        email: data.mail || data.userPrincipalName || '',
        displayName: data.displayName,
      };
    }

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

// ============================================
// Connection Management
// ============================================

/**
 * Connect a cloud storage provider
 * Requirements: 22.1 - Support integration with Google Drive, Dropbox, and OneDrive
 */
export async function connectProvider(
  userId: string,
  input: ConnectProviderInput
): Promise<CloudConnectionResponse> {
  const { provider, code, redirectUri } = input;

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(provider, code, redirectUri);

  // Get user info
  const userInfo = await getUserInfo(provider, tokens.accessToken);

  // Calculate expiry date
  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000)
    : undefined;

  // Check for existing connection
  const existingConnection = await prisma.cloudConnection.findFirst({
    where: {
      userId,
      provider,
    },
  });

  let connection;

  if (existingConnection) {
    // Update existing connection
    connection = await prisma.cloudConnection.update({
      where: { id: existingConnection.id },
      data: {
        email: userInfo.email,
        displayName: userInfo.displayName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || existingConnection.refreshToken,
        expiresAt,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  } else {
    // Create new connection
    connection = await prisma.cloudConnection.create({
      data: {
        id: uuidv4(),
        userId,
        provider,
        email: userInfo.email,
        displayName: userInfo.displayName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
      },
    });
  }

  logger.info('Cloud provider connected', {
    userId,
    provider,
    email: userInfo.email,
  });

  return {
    id: connection.id,
    provider: connection.provider as CloudProvider,
    email: connection.email,
    displayName: connection.displayName || undefined,
    isActive: connection.isActive,
    connectedAt: connection.connectedAt,
    lastUsedAt: connection.lastUsedAt || undefined,
  };
}

/**
 * Disconnect a cloud storage provider
 */
export async function disconnectProvider(
  userId: string,
  provider: CloudProvider
): Promise<void> {
  const connection = await prisma.cloudConnection.findFirst({
    where: { userId, provider },
  });

  if (!connection) {
    throw new CloudStorageError('Connection not found', 'CONNECTION_NOT_FOUND');
  }

  // Deactivate connection (soft delete)
  await prisma.cloudConnection.update({
    where: { id: connection.id },
    data: { isActive: false },
  });

  // Remove any sync configurations
  await prisma.projectSyncConfig.deleteMany({
    where: { userId, provider },
  });

  logger.info('Cloud provider disconnected', { userId, provider });
}

/**
 * Get connected providers for a user
 */
export async function getConnectedProviders(
  userId: string
): Promise<CloudConnectionResponse[]> {
  const connections = await prisma.cloudConnection.findMany({
    where: { userId, isActive: true },
  });

  return connections.map((conn) => ({
    id: conn.id,
    provider: conn.provider as CloudProvider,
    email: conn.email,
    displayName: conn.displayName || undefined,
    isActive: conn.isActive,
    connectedAt: conn.connectedAt,
    lastUsedAt: conn.lastUsedAt || undefined,
  }));
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(
  userId: string,
  provider: CloudProvider
): Promise<string> {
  const connection = await prisma.cloudConnection.findFirst({
    where: { userId, provider, isActive: true },
  });

  if (!connection) {
    throw new CloudStorageError(
      `No active ${provider} connection found`,
      'CONNECTION_NOT_FOUND'
    );
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = connection.expiresAt && connection.expiresAt < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired && connection.refreshToken) {
    try {
      const tokens = await refreshAccessToken(provider, connection.refreshToken);

      // Update connection with new tokens
      await prisma.cloudConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || connection.refreshToken,
          expiresAt: tokens.expiresIn
            ? new Date(Date.now() + tokens.expiresIn * 1000)
            : undefined,
          lastUsedAt: new Date(),
        },
      });

      return tokens.accessToken;
    } catch (error) {
      logger.error('Failed to refresh token', { userId, provider, error });
      throw new CloudStorageError(
        'Failed to refresh access token. Please reconnect your account.',
        'TOKEN_REFRESH_FAILED'
      );
    }
  }

  // Update last used timestamp
  await prisma.cloudConnection.update({
    where: { id: connection.id },
    data: { lastUsedAt: new Date() },
  });

  return connection.accessToken;
}


// ============================================
// File Browser Functions
// ============================================

/**
 * List files from cloud storage
 * Requirements: 22.2 - Display a file browser showing available documents
 */
export async function listFiles(
  userId: string,
  input: ListFilesInput
): Promise<CloudFileListResponse> {
  const { provider, folderId, pageToken, pageSize } = input;
  const accessToken = await getValidAccessToken(userId, provider);

  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE:
      return listGoogleDriveFiles(accessToken, folderId, pageToken, pageSize);

    case CloudProvider.DROPBOX:
      return listDropboxFiles(accessToken, input.path, pageToken, pageSize);

    case CloudProvider.ONEDRIVE:
      return listOneDriveFiles(accessToken, folderId, pageToken, pageSize);

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * List Google Drive files
 */
async function listGoogleDriveFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string,
  pageSize: number = 50
): Promise<CloudFileListResponse> {
  const oauth2Client = createGoogleOAuth2Client('');
  oauth2Client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : `'root' in parents and trashed = false`;

  const response = await drive.files.list({
    q: query,
    pageSize,
    pageToken: pageToken || undefined,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, thumbnailLink, shared, parents)',
    orderBy: 'folder,name',
  });

  const files: CloudFile[] = (response.data.files || []).map((file: drive_v3.Schema$File) => ({
    id: file.id || '',
    name: file.name || '',
    type: file.mimeType === 'application/vnd.google-apps.folder' ? CloudFileType.FOLDER : CloudFileType.FILE,
    mimeType: file.mimeType || undefined,
    size: file.size ? parseInt(file.size, 10) : undefined,
    path: `/${file.name}`,
    parentId: file.parents?.[0],
    modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    createdAt: file.createdTime ? new Date(file.createdTime) : undefined,
    downloadUrl: file.webViewLink || undefined,
    thumbnailUrl: file.thumbnailLink || undefined,
    isShared: file.shared || false,
    provider: CloudProvider.GOOGLE_DRIVE,
  }));

  return {
    files,
    nextPageToken: response.data.nextPageToken || undefined,
    hasMore: !!response.data.nextPageToken,
  };
}

/**
 * List Dropbox files
 */
async function listDropboxFiles(
  accessToken: string,
  path: string = '',
  cursor?: string,
  pageSize: number = 50
): Promise<CloudFileListResponse> {
  const dbx = new Dropbox({ accessToken });

  let response;
  if (cursor) {
    response = await dbx.filesListFolderContinue({ cursor });
  } else {
    response = await dbx.filesListFolder({
      path: path === '/' ? '' : path,
      limit: pageSize,
      include_mounted_folders: true,
      include_non_downloadable_files: false,
    });
  }

  const files: CloudFile[] = response.result.entries.map((entry) => ({
    id: entry['.tag'] === 'file' ? (entry as any).id : (entry as any).id,
    name: entry.name,
    type: entry['.tag'] === 'folder' ? CloudFileType.FOLDER : CloudFileType.FILE,
    mimeType: undefined,
    size: entry['.tag'] === 'file' ? (entry as any).size : undefined,
    path: entry.path_display || entry.path_lower || '',
    parentId: undefined,
    modifiedAt: entry['.tag'] === 'file' ? new Date((entry as any).server_modified) : undefined,
    createdAt: undefined,
    provider: CloudProvider.DROPBOX,
  }));

  return {
    files,
    nextPageToken: response.result.has_more ? response.result.cursor : undefined,
    hasMore: response.result.has_more,
  };
}

/**
 * List OneDrive files
 */
async function listOneDriveFiles(
  accessToken: string,
  folderId?: string,
  skipToken?: string,
  pageSize: number = 50
): Promise<CloudFileListResponse> {
  let url = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
    : 'https://graph.microsoft.com/v1.0/me/drive/root/children';

  url += `?$top=${pageSize}&$orderby=name`;

  if (skipToken) {
    url += `&$skiptoken=${skipToken}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new CloudStorageError('Failed to list OneDrive files', 'LIST_FILES_FAILED');
  }

  const data = await response.json() as OneDriveFileListResponse;

  const files: CloudFile[] = (data.value || []).map((item: OneDriveFileItem) => ({
    id: item.id,
    name: item.name,
    type: item.folder ? CloudFileType.FOLDER : CloudFileType.FILE,
    mimeType: item.file?.mimeType,
    size: item.size,
    path: item.parentReference?.path ? `${item.parentReference.path}/${item.name}` : `/${item.name}`,
    parentId: item.parentReference?.id,
    modifiedAt: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : undefined,
    createdAt: item.createdDateTime ? new Date(item.createdDateTime) : undefined,
    downloadUrl: item['@microsoft.graph.downloadUrl'],
    thumbnailUrl: item.thumbnails?.[0]?.medium?.url,
    isShared: item.shared ? true : false,
    provider: CloudProvider.ONEDRIVE,
  }));

  // Extract skip token from @odata.nextLink
  let nextPageToken: string | undefined;
  if (data['@odata.nextLink']) {
    const match = data['@odata.nextLink'].match(/\$skiptoken=([^&]+)/);
    nextPageToken = match ? match[1] : undefined;
  }

  return {
    files,
    nextPageToken,
    hasMore: !!data['@odata.nextLink'],
  };
}

// ============================================
// Import Functions
// ============================================

/**
 * Import a file from cloud storage
 * Requirements: 22.3 - Import document directly without requiring manual download
 */
export async function importFile(
  userId: string,
  input: ImportFileInput
): Promise<ImportFileResult> {
  const { provider, fileId, projectId } = input;
  const accessToken = await getValidAccessToken(userId, provider);

  // Download file content
  const { content, filename, mimeType } = await downloadFile(provider, accessToken, fileId);

  // Create or use existing project
  let targetProjectId = projectId;
  if (!targetProjectId) {
    // Create a new project for the imported file
    const project = await prisma.project.create({
      data: {
        id: uuidv4(),
        name: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        ownerId: userId,
        status: 'ACTIVE',
      },
    });
    targetProjectId = project.id;
  }

  // Store the document
  const result = await storeDocument(userId, {
    projectId: targetProjectId,
    content,
    type: 'original',
    metadata: {
      language: 'en',
      format: getFormatFromMimeType(mimeType),
      originalFilename: filename,
      mimeType,
    },
  });

  logger.info('File imported from cloud storage', {
    userId,
    provider,
    fileId,
    projectId: targetProjectId,
    documentId: result.documentId,
  });

  return {
    documentId: result.documentId,
    projectId: targetProjectId,
    filename,
    wordCount: result.wordCount,
    characterCount: result.characterCount,
    importedAt: new Date(),
  };
}

/**
 * Download file content from cloud storage
 */
async function downloadFile(
  provider: CloudProvider,
  accessToken: string,
  fileId: string
): Promise<{ content: string; filename: string; mimeType: string }> {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE:
      return downloadGoogleDriveFile(accessToken, fileId);

    case CloudProvider.DROPBOX:
      return downloadDropboxFile(accessToken, fileId);

    case CloudProvider.ONEDRIVE:
      return downloadOneDriveFile(accessToken, fileId);

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Download file from Google Drive
 */
async function downloadGoogleDriveFile(
  accessToken: string,
  fileId: string
): Promise<{ content: string; filename: string; mimeType: string }> {
  const oauth2Client = createGoogleOAuth2Client('');
  oauth2Client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Get file metadata
  const metadata = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
  });

  const filename = metadata.data.name || 'untitled';
  const mimeType = metadata.data.mimeType || 'text/plain';

  // Handle Google Docs export
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    const exportMimeType = getExportMimeType(mimeType);
    const response = await drive.files.export({
      fileId,
      mimeType: exportMimeType,
    }, { responseType: 'text' });

    return {
      content: response.data as string,
      filename,
      mimeType: exportMimeType,
    };
  }

  // Download regular file
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'text' });

  return {
    content: response.data as string,
    filename,
    mimeType,
  };
}

/**
 * Download file from Dropbox
 */
async function downloadDropboxFile(
  accessToken: string,
  fileId: string
): Promise<{ content: string; filename: string; mimeType: string }> {
  const dbx = new Dropbox({ accessToken });

  // Get file metadata
  const metadata = await dbx.filesGetMetadata({ path: fileId });
  const filename = metadata.result.name;

  // Download file
  const response = await dbx.filesDownload({ path: fileId });
  const fileBlob = (response.result as any).fileBlob;

  let content: string;
  if (fileBlob) {
    content = await fileBlob.text();
  } else {
    // For Node.js environment
    content = (response.result as any).fileBinary?.toString('utf-8') || '';
  }

  return {
    content,
    filename,
    mimeType: 'text/plain',
  };
}

/**
 * Download file from OneDrive
 */
async function downloadOneDriveFile(
  accessToken: string,
  fileId: string
): Promise<{ content: string; filename: string; mimeType: string }> {
  // Get file metadata
  const metadataResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!metadataResponse.ok) {
    throw new CloudStorageError('Failed to get OneDrive file metadata', 'DOWNLOAD_FAILED');
  }

  const metadata = await metadataResponse.json() as OneDriveFileItem;
  const filename = metadata.name;
  const mimeType = metadata.file?.mimeType || 'text/plain';

  // Download file content
  const downloadUrl = metadata['@microsoft.graph.downloadUrl'];
  if (!downloadUrl) {
    throw new CloudStorageError('No download URL available', 'DOWNLOAD_FAILED');
  }

  const contentResponse = await fetch(downloadUrl);
  if (!contentResponse.ok) {
    throw new CloudStorageError('Failed to download OneDrive file', 'DOWNLOAD_FAILED');
  }

  const content = await contentResponse.text();

  return {
    content,
    filename,
    mimeType,
  };
}

// ============================================
// Export Functions
// ============================================

/**
 * Export a document to cloud storage
 * Requirements: 22.4 - Save humanized output directly to user's connected cloud account
 */
export async function exportFile(
  userId: string,
  input: ExportFileInput
): Promise<ExportFileResult> {
  const { provider, documentId, targetPath, filename, format } = input;
  const accessToken = await getValidAccessToken(userId, provider);

  // Get document content
  const document = await retrieveDocument(documentId);

  if (!document) {
    throw new CloudStorageError('Document not found', 'DOCUMENT_NOT_FOUND');
  }

  const content = document.content;
  const mimeType = getMimeTypeFromFormat(format || 'txt');

  // Upload to cloud storage
  const result = await uploadFile(provider, accessToken, {
    content,
    filename: `${filename}.${format || 'txt'}`,
    targetPath,
    mimeType,
  });

  logger.info('File exported to cloud storage', {
    userId,
    provider,
    documentId,
    fileId: result.fileId,
  });

  return result;
}

/**
 * Upload file to cloud storage
 */
async function uploadFile(
  provider: CloudProvider,
  accessToken: string,
  options: {
    content: string;
    filename: string;
    targetPath: string;
    mimeType: string;
  }
): Promise<ExportFileResult> {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE:
      return uploadToGoogleDrive(accessToken, options);

    case CloudProvider.DROPBOX:
      return uploadToDropbox(accessToken, options);

    case CloudProvider.ONEDRIVE:
      return uploadToOneDrive(accessToken, options);

    default:
      throw new CloudStorageError(`Unsupported provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Upload file to Google Drive
 */
async function uploadToGoogleDrive(
  accessToken: string,
  options: { content: string; filename: string; targetPath: string; mimeType: string }
): Promise<ExportFileResult> {
  const oauth2Client = createGoogleOAuth2Client('');
  oauth2Client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Find or create target folder
  let parentId = 'root';
  if (options.targetPath && options.targetPath !== '/') {
    parentId = await findOrCreateGoogleDriveFolder(drive, options.targetPath);
  }

  // Create file
  const response = await drive.files.create({
    requestBody: {
      name: options.filename,
      parents: [parentId],
      mimeType: options.mimeType,
    },
    media: {
      mimeType: options.mimeType,
      body: options.content,
    },
    fields: 'id, name, size, webViewLink',
  });

  return {
    fileId: response.data.id || '',
    filename: response.data.name || options.filename,
    path: options.targetPath,
    size: parseInt(response.data.size || '0', 10) || Buffer.byteLength(options.content, 'utf-8'),
    exportedAt: new Date(),
    webViewLink: response.data.webViewLink || undefined,
  };
}

/**
 * Find or create Google Drive folder
 */
async function findOrCreateGoogleDriveFolder(
  drive: drive_v3.Drive,
  path: string
): Promise<string> {
  const parts = path.split('/').filter(Boolean);
  let parentId = 'root';

  for (const folderName of parts) {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    if (response.data.files && response.data.files.length > 0) {
      parentId = response.data.files[0].id || parentId;
    } else {
      // Create folder
      const createResponse = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      });
      parentId = createResponse.data.id || parentId;
    }
  }

  return parentId;
}

/**
 * Upload file to Dropbox
 */
async function uploadToDropbox(
  accessToken: string,
  options: { content: string; filename: string; targetPath: string; mimeType: string }
): Promise<ExportFileResult> {
  const dbx = new Dropbox({ accessToken });

  const path = options.targetPath === '/'
    ? `/${options.filename}`
    : `${options.targetPath}/${options.filename}`;

  const response = await dbx.filesUpload({
    path,
    contents: options.content,
    mode: { '.tag': 'overwrite' },
  });

  return {
    fileId: response.result.id,
    filename: response.result.name,
    path: response.result.path_display || path,
    size: response.result.size,
    exportedAt: new Date(),
  };
}

/**
 * Upload file to OneDrive
 */
async function uploadToOneDrive(
  accessToken: string,
  options: { content: string; filename: string; targetPath: string; mimeType: string }
): Promise<ExportFileResult> {
  const path = options.targetPath === '/'
    ? options.filename
    : `${options.targetPath}/${options.filename}`;

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${path}:/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': options.mimeType,
      },
      body: options.content,
    }
  );

  if (!response.ok) {
    throw new CloudStorageError('Failed to upload to OneDrive', 'UPLOAD_FAILED');
  }

  const data = await response.json() as OneDriveFileItem;

  return {
    fileId: data.id,
    filename: data.name,
    path: data.parentReference?.path ? `${data.parentReference.path}/${data.name}` : `/${data.name}`,
    size: data.size || 0,
    exportedAt: new Date(),
    webViewLink: data.webUrl,
  };
}


// ============================================
// Sync Functions
// ============================================

/**
 * Configure project sync with cloud storage
 * Requirements: 22.5 - Automatically backup projects to cloud storage
 */
export async function configureSyncForProject(
  userId: string,
  projectId: string,
  input: ConfigureSyncInput
): Promise<ProjectSyncConfig> {
  const { provider, cloudFolderId, autoSync, syncInterval } = input;

  // Verify user has access to the project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
  });

  if (!project) {
    throw new CloudStorageError('Project not found or access denied', 'PROJECT_NOT_FOUND');
  }

  // Verify cloud connection exists
  const connection = await prisma.cloudConnection.findFirst({
    where: { userId, provider, isActive: true },
  });

  if (!connection) {
    throw new CloudStorageError(
      `No active ${provider} connection found`,
      'CONNECTION_NOT_FOUND'
    );
  }

  // Get folder path
  const accessToken = await getValidAccessToken(userId, provider);
  const folderPath = await getFolderPath(provider, accessToken, cloudFolderId);

  // Check for existing sync config
  const existingConfig = await prisma.projectSyncConfig.findFirst({
    where: { projectId, provider },
  });

  let syncConfig;

  if (existingConfig) {
    // Update existing config
    syncConfig = await prisma.projectSyncConfig.update({
      where: { id: existingConfig.id },
      data: {
        cloudFolderId,
        cloudFolderPath: folderPath,
        autoSync,
        syncInterval,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new config
    syncConfig = await prisma.projectSyncConfig.create({
      data: {
        id: uuidv4(),
        projectId,
        userId,
        provider,
        cloudFolderId,
        cloudFolderPath: folderPath,
        autoSync,
        syncInterval,
        lastSyncStatus: SyncStatus.IDLE,
      },
    });
  }

  logger.info('Project sync configured', {
    userId,
    projectId,
    provider,
    autoSync,
  });

  return {
    id: syncConfig.id,
    projectId: syncConfig.projectId,
    userId: syncConfig.userId,
    provider: syncConfig.provider as CloudProvider,
    cloudFolderId: syncConfig.cloudFolderId,
    cloudFolderPath: syncConfig.cloudFolderPath,
    autoSync: syncConfig.autoSync,
    syncInterval: syncConfig.syncInterval || undefined,
    lastSyncAt: syncConfig.lastSyncAt || undefined,
    lastSyncStatus: syncConfig.lastSyncStatus as SyncStatus,
    lastSyncError: syncConfig.lastSyncError || undefined,
    createdAt: syncConfig.createdAt,
    updatedAt: syncConfig.updatedAt,
  };
}

/**
 * Sync a project to cloud storage
 * Requirements: 22.5 - Automatically backup projects to cloud storage
 */
export async function syncProject(
  userId: string,
  projectId: string,
  provider: CloudProvider
): Promise<SyncResult> {
  const syncConfig = await prisma.projectSyncConfig.findFirst({
    where: { projectId, provider, userId },
  });

  if (!syncConfig) {
    throw new CloudStorageError('Sync configuration not found', 'SYNC_CONFIG_NOT_FOUND');
  }

  // Update status to syncing
  await prisma.projectSyncConfig.update({
    where: { id: syncConfig.id },
    data: { lastSyncStatus: SyncStatus.SYNCING },
  });

  const errors: string[] = [];
  let filesUploaded = 0;
  let filesUpdated = 0;

  try {
    const accessToken = await getValidAccessToken(userId, provider);

    // Get project with versions
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Sync last 10 versions
        },
      },
    });

    if (!project) {
      throw new CloudStorageError('Project not found', 'PROJECT_NOT_FOUND');
    }

    // Get documents for the project
    const documents = await DocumentModel.find({ projectId });

    // Upload each document
    for (const doc of documents) {
      try {
        const filename = `${project.name}_${doc.type}_${doc._id}.txt`;
        await uploadFile(provider, accessToken, {
          content: doc.content,
          filename,
          targetPath: syncConfig.cloudFolderPath,
          mimeType: 'text/plain',
        });
        filesUploaded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to upload document ${doc._id}: ${errorMessage}`);
      }
    }

    // Update sync status
    await prisma.projectSyncConfig.update({
      where: { id: syncConfig.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: errors.length > 0 ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        lastSyncError: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    logger.info('Project synced to cloud storage', {
      userId,
      projectId,
      provider,
      filesUploaded,
      errors: errors.length,
    });

    return {
      projectId,
      provider,
      status: errors.length > 0 ? SyncStatus.FAILED : SyncStatus.SUCCESS,
      filesUploaded,
      filesUpdated,
      errors,
      syncedAt: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.projectSyncConfig.update({
      where: { id: syncConfig.id },
      data: {
        lastSyncStatus: SyncStatus.FAILED,
        lastSyncError: errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Get sync configurations for a user
 */
export async function getSyncConfigurations(
  userId: string,
  projectId?: string
): Promise<ProjectSyncConfig[]> {
  const where: { userId: string; projectId?: string } = { userId };
  if (projectId) {
    where.projectId = projectId;
  }

  const configs = await prisma.projectSyncConfig.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return configs.map((config) => ({
    id: config.id,
    projectId: config.projectId,
    userId: config.userId,
    provider: config.provider as CloudProvider,
    cloudFolderId: config.cloudFolderId,
    cloudFolderPath: config.cloudFolderPath,
    autoSync: config.autoSync,
    syncInterval: config.syncInterval || undefined,
    lastSyncAt: config.lastSyncAt || undefined,
    lastSyncStatus: config.lastSyncStatus as SyncStatus,
    lastSyncError: config.lastSyncError || undefined,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }));
}

/**
 * Remove sync configuration
 */
export async function removeSyncConfiguration(
  userId: string,
  projectId: string,
  provider: CloudProvider
): Promise<void> {
  const config = await prisma.projectSyncConfig.findFirst({
    where: { projectId, provider, userId },
  });

  if (!config) {
    throw new CloudStorageError('Sync configuration not found', 'SYNC_CONFIG_NOT_FOUND');
  }

  await prisma.projectSyncConfig.delete({
    where: { id: config.id },
  });

  logger.info('Sync configuration removed', { userId, projectId, provider });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get folder path from cloud storage
 */
async function getFolderPath(
  provider: CloudProvider,
  accessToken: string,
  folderId: string
): Promise<string> {
  switch (provider) {
    case CloudProvider.GOOGLE_DRIVE: {
      const oauth2Client = createGoogleOAuth2Client('');
      oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const response = await drive.files.get({
        fileId: folderId,
        fields: 'name',
      });

      return `/${response.data.name}`;
    }

    case CloudProvider.DROPBOX: {
      const dbx = new Dropbox({ accessToken });
      const response = await dbx.filesGetMetadata({ path: folderId });
      return response.result.path_display || folderId;
    }

    case CloudProvider.ONEDRIVE: {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new CloudStorageError('Failed to get folder info', 'FOLDER_NOT_FOUND');
      }

      const data = await response.json() as OneDriveFileItem;
      return data.parentReference?.path
        ? `${data.parentReference.path}/${data.name}`
        : `/${data.name}`;
    }

    default:
      return '/';
  }
}

/**
 * Get export MIME type for Google Docs
 */
function getExportMimeType(googleMimeType: string): string {
  const mimeTypeMap: Record<string, string> = {
    'application/vnd.google-apps.document': 'text/plain',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
  };

  return mimeTypeMap[googleMimeType] || 'text/plain';
}

/**
 * Get format from MIME type
 */
function getFormatFromMimeType(mimeType: string): 'plain' | 'markdown' | 'html' | 'docx' | 'pdf' | 'epub' {
  const formatMap: Record<string, 'plain' | 'markdown' | 'html' | 'docx' | 'pdf' | 'epub'> = {
    'text/plain': 'plain',
    'text/markdown': 'markdown',
    'text/html': 'html',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/pdf': 'pdf',
    'application/epub+zip': 'epub',
  };

  return formatMap[mimeType] || 'plain';
}

/**
 * Get MIME type from format
 */
function getMimeTypeFromFormat(format: string): string {
  const mimeTypeMap: Record<string, string> = {
    txt: 'text/plain',
    markdown: 'text/markdown',
    html: 'text/html',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
  };

  return mimeTypeMap[format] || 'text/plain';
}
