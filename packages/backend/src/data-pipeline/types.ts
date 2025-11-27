/**
 * Data Pipeline Types
 * Type definitions for ETL pipeline system, data quality validation, batch processing, and scheduling
 * Requirements: 89
 */

/**
 * Pipeline status
 */
export type PipelineStatus = 'draft' | 'active' | 'paused' | 'failed' | 'archived';

/**
 * Job status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';

/**
 * Data source type
 */
export type DataSourceType = 'database' | 'api' | 'file' | 's3' | 'webhook' | 'stream';

/**
 * Data destination type
 */
export type DataDestinationType = 'database' | 'api' | 'file' | 's3' | 'webhook' | 'stream';

/**
 * Transformation type
 */
export type TransformationType = 
  | 'filter'
  | 'map'
  | 'aggregate'
  | 'join'
  | 'sort'
  | 'deduplicate'
  | 'validate'
  | 'enrich'
  | 'custom';

/**
 * Quality check type
 */
export type QualityCheckType = 
  | 'completeness'
  | 'uniqueness'
  | 'validity'
  | 'consistency'
  | 'timeliness'
  | 'accuracy';

/**
 * Quality severity
 */
export type QualitySeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Schedule frequency
 */
export type ScheduleFrequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';

/**
 * Data source configuration
 */
export interface DataSource {
  /** Source type */
  type: DataSourceType;
  /** Connection string or URL */
  connection: string;
  /** Query or path */
  query?: string;
  /** Additional options */
  options?: Record<string, unknown>;
  /** Credentials reference */
  credentialsRef?: string;
}

/**
 * Data destination configuration
 */
export interface DataDestination {
  /** Destination type */
  type: DataDestinationType;
  /** Connection string or URL */
  connection: string;
  /** Target table/path */
  target?: string;
  /** Write mode */
  writeMode?: 'append' | 'overwrite' | 'upsert' | 'merge';
  /** Additional options */
  options?: Record<string, unknown>;
  /** Credentials reference */
  credentialsRef?: string;
}

/**
 * Transformation step
 */
export interface Transformation {
  /** Transformation ID */
  id: string;
  /** Transformation type */
  type: TransformationType;
  /** Transformation name */
  name: string;
  /** Configuration */
  config: TransformationConfig;
  /** Order in pipeline */
  order: number;
  /** Enabled flag */
  enabled: boolean;
}


/**
 * Transformation configuration
 */
export interface TransformationConfig {
  /** Filter expression */
  filterExpression?: string;
  /** Field mappings */
  fieldMappings?: Record<string, string>;
  /** Aggregation config */
  aggregation?: AggregationConfig;
  /** Join config */
  join?: JoinConfig;
  /** Sort config */
  sort?: SortConfig;
  /** Validation rules */
  validationRules?: ValidationRule[];
  /** Custom function */
  customFunction?: string;
  /** Additional parameters */
  params?: Record<string, unknown>;
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  /** Group by fields */
  groupBy: string[];
  /** Aggregation operations */
  operations: AggregationOperation[];
}

/**
 * Aggregation operation
 */
export interface AggregationOperation {
  /** Field to aggregate */
  field: string;
  /** Operation type */
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';
  /** Output field name */
  outputField: string;
}

/**
 * Join configuration
 */
export interface JoinConfig {
  /** Join type */
  type: 'inner' | 'left' | 'right' | 'full';
  /** Right side source */
  rightSource: DataSource;
  /** Join conditions */
  conditions: JoinCondition[];
}

/**
 * Join condition
 */
export interface JoinCondition {
  /** Left field */
  leftField: string;
  /** Right field */
  rightField: string;
  /** Operator */
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Sort fields */
  fields: SortField[];
}

/**
 * Sort field
 */
export interface SortField {
  /** Field name */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Validation rule
 */
export interface ValidationRule {
  /** Rule ID */
  id: string;
  /** Field to validate */
  field: string;
  /** Rule type */
  type: 'required' | 'type' | 'range' | 'pattern' | 'enum' | 'custom';
  /** Expected value/pattern */
  expected?: unknown;
  /** Error message */
  message: string;
  /** Severity */
  severity: QualitySeverity;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Pipeline name */
  name: string;
  /** Description */
  description?: string;
  /** Data source */
  source: DataSource;
  /** Transformations */
  transformations: Transformation[];
  /** Data destination */
  destination: DataDestination;
  /** Schedule configuration */
  schedule?: ScheduleConfig;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Alert configuration */
  alerts?: AlertConfig;
  /** Tags */
  tags?: string[];
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  /** Schedule frequency */
  frequency: ScheduleFrequency;
  /** Cron expression (for cron frequency) */
  cronExpression?: string;
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
  /** Timezone */
  timezone?: string;
  /** Enabled flag */
  enabled: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  initialDelayMs: number;
  /** Maximum delay in ms */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Retryable error codes */
  retryableErrors?: string[];
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert on failure */
  onFailure: boolean;
  /** Alert on success */
  onSuccess: boolean;
  /** Alert on warning */
  onWarning: boolean;
  /** Alert channels */
  channels: AlertChannel[];
}

/**
 * Alert channel
 */
export interface AlertChannel {
  /** Channel type */
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  /** Target (email, URL, etc.) */
  target: string;
  /** Additional config */
  config?: Record<string, unknown>;
}

/**
 * Pipeline definition
 */
export interface Pipeline {
  /** Pipeline ID */
  id: string;
  /** Pipeline configuration */
  config: PipelineConfig;
  /** Pipeline status */
  status: PipelineStatus;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Created by user ID */
  createdBy: string;
  /** Last run timestamp */
  lastRunAt?: Date;
  /** Next scheduled run */
  nextRunAt?: Date;
  /** Total runs */
  totalRuns: number;
  /** Successful runs */
  successfulRuns: number;
  /** Failed runs */
  failedRuns: number;
}

/**
 * Pipeline job
 */
export interface PipelineJob {
  /** Job ID */
  id: string;
  /** Pipeline ID */
  pipelineId: string;
  /** Job status */
  status: JobStatus;
  /** Started timestamp */
  startedAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Records processed */
  recordsProcessed: number;
  /** Records failed */
  recordsFailed: number;
  /** Current step */
  currentStep?: string;
  /** Progress percentage */
  progress: number;
  /** Error message */
  errorMessage?: string;
  /** Error details */
  errorDetails?: Record<string, unknown>;
  /** Retry count */
  retryCount: number;
  /** Triggered by */
  triggeredBy: 'schedule' | 'manual' | 'api' | 'retry';
  /** Execution logs */
  logs: JobLog[];
}

/**
 * Job log entry
 */
export interface JobLog {
  /** Timestamp */
  timestamp: Date;
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Message */
  message: string;
  /** Step name */
  step?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Pipeline result
 */
export interface PipelineResult {
  /** Job ID */
  jobId: string;
  /** Pipeline ID */
  pipelineId: string;
  /** Success flag */
  success: boolean;
  /** Records processed */
  recordsProcessed: number;
  /** Records failed */
  recordsFailed: number;
  /** Duration in ms */
  durationMs: number;
  /** Quality report */
  qualityReport?: QualityReport;
  /** Output summary */
  outputSummary?: Record<string, unknown>;
  /** Errors */
  errors: PipelineError[];
}

/**
 * Pipeline error
 */
export interface PipelineError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Step where error occurred */
  step?: string;
  /** Record index */
  recordIndex?: number;
  /** Record data */
  recordData?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Recoverable flag */
  recoverable: boolean;
}

/**
 * Quality report
 */
export interface QualityReport {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Total records checked */
  totalRecords: number;
  /** Valid records */
  validRecords: number;
  /** Invalid records */
  invalidRecords: number;
  /** Quality checks */
  checks: QualityCheck[];
  /** Issues found */
  issues: QualityIssue[];
  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Quality check result
 */
export interface QualityCheck {
  /** Check type */
  type: QualityCheckType;
  /** Check name */
  name: string;
  /** Field checked */
  field?: string;
  /** Passed flag */
  passed: boolean;
  /** Score (0-100) */
  score: number;
  /** Details */
  details?: string;
}

/**
 * Quality issue
 */
export interface QualityIssue {
  /** Issue ID */
  id: string;
  /** Check type */
  type: QualityCheckType;
  /** Severity */
  severity: QualitySeverity;
  /** Field */
  field?: string;
  /** Message */
  message: string;
  /** Affected records count */
  affectedRecords: number;
  /** Sample values */
  sampleValues?: unknown[];
  /** Recommendation */
  recommendation?: string;
}

/**
 * Processed data record
 */
export interface ProcessedData {
  /** Original data */
  original: Record<string, unknown>;
  /** Transformed data */
  transformed: Record<string, unknown>;
  /** Valid flag */
  valid: boolean;
  /** Validation errors */
  errors?: string[];
  /** Processing metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create pipeline options
 */
export interface CreatePipelineOptions {
  /** Pipeline configuration */
  config: PipelineConfig;
  /** User creating the pipeline */
  createdBy: string;
  /** Auto-activate */
  autoActivate?: boolean;
}

/**
 * Execute pipeline options
 */
export interface ExecutePipelineOptions {
  /** Pipeline ID */
  pipelineId: string;
  /** Override source data */
  sourceData?: Record<string, unknown>[];
  /** Dry run flag */
  dryRun?: boolean;
  /** Triggered by */
  triggeredBy?: 'schedule' | 'manual' | 'api' | 'retry';
}

/**
 * Data pipeline service configuration
 */
export interface DataPipelineServiceConfig {
  /** Default retry attempts */
  defaultRetryAttempts: number;
  /** Default retry delay in ms */
  defaultRetryDelayMs: number;
  /** Maximum batch size */
  maxBatchSize: number;
  /** Job timeout in ms */
  jobTimeoutMs: number;
  /** Quality threshold for pass */
  qualityThreshold: number;
  /** Log retention days */
  logRetentionDays: number;
}
