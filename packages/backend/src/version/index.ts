/**
 * Version Control module - exports all version components
 * 
 * Requirements: 16 - Save drafts and revisions with version history
 * Requirements: 56 - Branching system with merge conflict resolution
 * Requirements: 102 - Auto-save functionality
 */

export * from './types';
export * from './version.service';
export * from './branch.service';
export * from './auto-save.service';
export { versionRouter } from './version.routes';
export { branchRouter } from './branch.routes';
