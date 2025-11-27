/**
 * Auto-Save Service
 * Handles automatic saving of drafts every 2 minutes
 * 
 * Requirements: 16.4 - Auto-save drafts every 2 minutes during active editing
 * Requirements: 102 - Auto-save functionality
 */

import { createVersion, hasContentChanged } from './version.service';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';

// Default auto-save interval: 2 minutes (120 seconds)
export const DEFAULT_AUTO_SAVE_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Auto-save session tracking
 */
interface AutoSaveSession {
  projectId: string;
  userId: string;
  branchId: string | undefined;
  lastContent: string;
  lastSaveAt: Date;
  intervalId?: NodeJS.Timeout;
}

// In-memory store for active auto-save sessions
const activeSessions = new Map<string, AutoSaveSession>();

/**
 * Generate session key for tracking
 */
function getSessionKey(projectId: string, userId: string, branchId?: string): string {
  return `${projectId}:${userId}:${branchId ?? 'main'}`;
}

/**
 * Start auto-save for a project
 * Requirements: 16.4 - Auto-save drafts every 2 minutes
 */
export async function startAutoSave(
  projectId: string,
  userId: string,
  initialContent: string,
  branchId?: string,
  intervalMs: number = DEFAULT_AUTO_SAVE_INTERVAL_MS
): Promise<{ sessionKey: string; intervalMs: number }> {
  const sessionKey = getSessionKey(projectId, userId, branchId);

  // Stop existing session if any
  stopAutoSave(sessionKey);

  // Create new session
  const session: AutoSaveSession = {
    projectId,
    userId,
    branchId,
    lastContent: initialContent,
    lastSaveAt: new Date(),
  };

  activeSessions.set(sessionKey, session);

  logger.info('Auto-save started', {
    sessionKey,
    projectId,
    userId,
    intervalMs,
  });

  return { sessionKey, intervalMs };
}

/**
 * Update content for auto-save tracking
 * Called when user makes changes
 */
export function updateAutoSaveContent(
  sessionKey: string,
  content: string
): boolean {
  const session = activeSessions.get(sessionKey);

  if (!session) {
    return false;
  }

  session.lastContent = content;
  return true;
}

/**
 * Trigger auto-save for a session
 * Requirements: 16.4 - Auto-save drafts every 2 minutes
 */
export async function triggerAutoSave(
  sessionKey: string
): Promise<{ saved: boolean; versionId?: string; reason?: string }> {
  const session = activeSessions.get(sessionKey);

  if (!session) {
    return { saved: false, reason: 'Session not found' };
  }

  try {
    // Check if content has changed since last save
    const hasChanged = await hasContentChanged(
      session.projectId,
      session.lastContent,
      session.branchId
    );

    if (!hasChanged) {
      return { saved: false, reason: 'No changes detected' };
    }

    // Create auto-save version
    const version = await createVersion(session.userId, {
      projectId: session.projectId,
      content: session.lastContent,
      changesSummary: 'Auto-save',
      isAutoSave: true,
      branchId: session.branchId,
    });

    session.lastSaveAt = new Date();

    logger.debug('Auto-save completed', {
      sessionKey,
      versionId: version.id,
      versionNumber: version.versionNumber,
    });

    return { saved: true, versionId: version.id };
  } catch (error) {
    logger.error('Auto-save failed', {
      sessionKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { saved: false, reason: 'Auto-save failed' };
  }
}

/**
 * Stop auto-save for a session
 */
export function stopAutoSave(sessionKey: string): boolean {
  const session = activeSessions.get(sessionKey);

  if (!session) {
    return false;
  }

  if (session.intervalId) {
    clearInterval(session.intervalId);
  }

  activeSessions.delete(sessionKey);

  logger.info('Auto-save stopped', { sessionKey });

  return true;
}

/**
 * Get auto-save status for a session
 */
export function getAutoSaveStatus(sessionKey: string): {
  active: boolean;
  lastSaveAt?: Date;
  projectId?: string;
} {
  const session = activeSessions.get(sessionKey);

  if (!session) {
    return { active: false };
  }

  return {
    active: true,
    lastSaveAt: session.lastSaveAt,
    projectId: session.projectId,
  };
}

/**
 * Get user's auto-save preferences
 */
export async function getUserAutoSavePreferences(
  userId: string
): Promise<{ enabled: boolean; intervalSeconds: number }> {
  const preferences = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      autoSaveEnabled: true,
      autoSaveIntervalSecs: true,
    },
  });

  return {
    enabled: preferences?.autoSaveEnabled ?? true,
    intervalSeconds: preferences?.autoSaveIntervalSecs ?? 120,
  };
}

/**
 * Update user's auto-save preferences
 */
export async function updateUserAutoSavePreferences(
  userId: string,
  enabled: boolean,
  intervalSeconds?: number
): Promise<{ enabled: boolean; intervalSeconds: number }> {
  const data: { autoSaveEnabled: boolean; autoSaveIntervalSecs?: number } = {
    autoSaveEnabled: enabled,
  };

  if (intervalSeconds !== undefined) {
    // Minimum 30 seconds, maximum 10 minutes
    data.autoSaveIntervalSecs = Math.max(30, Math.min(600, intervalSeconds));
  }

  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
    select: {
      autoSaveEnabled: true,
      autoSaveIntervalSecs: true,
    },
  });

  return {
    enabled: preferences.autoSaveEnabled,
    intervalSeconds: preferences.autoSaveIntervalSecs,
  };
}

/**
 * Get all active auto-save sessions for a user
 */
export function getUserActiveSessions(userId: string): string[] {
  const userSessions: string[] = [];

  for (const [key, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      userSessions.push(key);
    }
  }

  return userSessions;
}

/**
 * Stop all auto-save sessions for a user
 */
export function stopAllUserSessions(userId: string): number {
  const userSessions = getUserActiveSessions(userId);

  for (const sessionKey of userSessions) {
    stopAutoSave(sessionKey);
  }

  return userSessions.length;
}

/**
 * Cleanup stale sessions (sessions older than 1 hour without activity)
 */
export function cleanupStaleSessions(maxAgeMs: number = 60 * 60 * 1000): number {
  const now = new Date();
  let cleanedCount = 0;

  for (const [key, session] of activeSessions.entries()) {
    const age = now.getTime() - session.lastSaveAt.getTime();
    if (age > maxAgeMs) {
      stopAutoSave(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info('Cleaned up stale auto-save sessions', { count: cleanedCount });
  }

  return cleanedCount;
}
