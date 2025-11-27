/**
 * Admin Panel Module
 * Requirements: 19 - Monitor system performance and user activity
 */

export { adminRoutes } from './admin.routes';
export {
  getSystemMetrics,
  getUserActivitySummary,
  getUserActivityList,
  getLogs,
  getErrorSummary,
  getErrorLogs,
  resolveError,
  logError,
  configureAlert,
  getAlertConfigs,
  getAlerts,
  acknowledgeAlert,
  getPerformanceHistory,
  recordPerformanceData,
  getAdminDashboard,
  AdminError,
} from './admin.service';
export * from './types';
