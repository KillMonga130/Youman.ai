/**
 * Disaster Recovery Types
 * Type definitions for backup, recovery, replication, and failover
 * Requirements: 92 - Disaster recovery and business continuity
 */

// Backup configuration
export interface BackupConfig {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  schedule: string; // cron expression
  retentionDays: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  targetRegions: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Backup record
export interface Backup {
  id: string;
  configId: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'verified';
  startTime: Date;
  endTime?: Date;
  sizeBytes: number;
  checksum: string;
  location: BackupLocation;
  metadata: BackupMetadata;
  error?: string;
}

export interface BackupLocation {
  primary: string;
  replicas: string[];
  region: string;
}

export interface BackupMetadata {
  databaseVersion: string;
  schemaVersion: string;
  recordCount: number;
  tables: string[];
  timestamp: Date;
}

// Point-in-time recovery
export interface RecoveryPoint {
  id: string;
  timestamp: Date;
  type: 'backup' | 'snapshot' | 'wal';
  backupId?: string;
  available: boolean;
  expiresAt: Date;
}

export interface RecoveryRequest {
  id: string;
  targetTime: Date;
  targetBackupId?: string;
  status: 'pending' | 'validating' | 'restoring' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  restoredRecords: number;
  error?: string;
}

// Cross-region replication
export interface ReplicationConfig {
  id: string;
  sourceRegion: string;
  targetRegions: string[];
  mode: 'sync' | 'async';
  lagThresholdMs: number;
  enabled: boolean;
  createdAt: Date;
}

export interface ReplicationStatus {
  configId: string;
  sourceRegion: string;
  targetRegion: string;
  status: 'healthy' | 'lagging' | 'failed' | 'paused';
  lagMs: number;
  lastSyncTime: Date;
  bytesReplicated: number;
  pendingBytes: number;
}

// Failover management
export interface FailoverConfig {
  id: string;
  primaryRegion: string;
  failoverRegions: string[];
  autoFailoverEnabled: boolean;
  healthCheckIntervalMs: number;
  failoverThreshold: number; // consecutive failures before failover
  enabled: boolean;
}

export interface FailoverEvent {
  id: string;
  configId: string;
  type: 'automatic' | 'manual';
  fromRegion: string;
  toRegion: string;
  reason: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  downtime: number; // milliseconds
  error?: string;
}

// Health check
export interface HealthCheck {
  region: string;
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTimeMs: number;
  lastError?: string;
}

// Recovery testing
export interface RecoveryTest {
  id: string;
  type: 'backup_restore' | 'failover' | 'replication';
  status: 'scheduled' | 'running' | 'passed' | 'failed';
  scheduledTime: Date;
  startTime?: Date;
  endTime?: Date;
  results: RecoveryTestResult;
}

export interface RecoveryTestResult {
  rtoActual: number; // Recovery Time Objective - actual (seconds)
  rtoTarget: number; // Recovery Time Objective - target (seconds)
  rpoActual: number; // Recovery Point Objective - actual (seconds)
  rpoTarget: number; // Recovery Point Objective - target (seconds)
  dataIntegrityPassed: boolean;
  serviceAvailabilityPassed: boolean;
  notes: string[];
}

// Disaster recovery status
export interface DisasterRecoveryStatus {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  lastBackup?: Backup;
  lastSuccessfulBackup?: Backup;
  replicationStatus: ReplicationStatus[];
  failoverReadiness: boolean;
  lastRecoveryTest?: RecoveryTest;
  alerts: DRAlert[];
}

export interface DRAlert {
  id: string;
  type: 'backup_failed' | 'replication_lag' | 'failover_triggered' | 'health_degraded';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

// API Request/Response types
export interface CreateBackupRequest {
  type: 'full' | 'incremental' | 'differential';
  description?: string;
}

export interface RestoreRequest {
  backupId?: string;
  pointInTime?: Date;
  targetRegion?: string;
  validateOnly?: boolean;
}

export interface FailoverRequest {
  targetRegion: string;
  reason: string;
  force?: boolean;
}

export interface ConfigureReplicationRequest {
  sourceRegion: string;
  targetRegions: string[];
  mode: 'sync' | 'async';
  lagThresholdMs?: number;
}
