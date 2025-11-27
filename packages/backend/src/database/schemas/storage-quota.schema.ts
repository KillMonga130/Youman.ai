/**
 * MongoDB Storage Quota Schema
 * Tracks storage usage per user for quota enforcement
 * 
 * Requirements: 63 - Data retention policies
 * Requirements: 20 - Subscription tiers with different capabilities
 */

import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

/**
 * Storage usage entry for tracking individual operations
 */
export interface IStorageUsageEntry {
  projectId: string;
  documentId: string;
  bytes: number;
  operation: 'upload' | 'delete';
  timestamp: Date;
}

/**
 * Storage quota interface
 */
export interface IStorageQuota extends MongoDocument {
  userId: string;
  totalBytesUsed: number;
  documentCount: number;
  usageHistory: IStorageUsageEntry[];
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorageUsageEntrySchema = new Schema<IStorageUsageEntry>(
  {
    projectId: { type: String, required: true },
    documentId: { type: String, required: true },
    bytes: { type: Number, required: true },
    operation: { 
      type: String, 
      enum: ['upload', 'delete'], 
      required: true 
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StorageQuotaSchema = new Schema<IStorageQuota>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalBytesUsed: {
      type: Number,
      required: true,
      default: 0,
    },
    documentCount: {
      type: Number,
      required: true,
      default: 0,
    },
    usageHistory: {
      type: [StorageUsageEntrySchema],
      default: [],
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'storage_quotas',
  }
);

// Indexes for performance
StorageQuotaSchema.index({ userId: 1 });
StorageQuotaSchema.index({ totalBytesUsed: -1 });
StorageQuotaSchema.index({ lastCalculatedAt: 1 });

// Limit usage history to last 1000 entries to prevent unbounded growth
StorageQuotaSchema.pre('save', function(next) {
  if (this.usageHistory && this.usageHistory.length > 1000) {
    this.usageHistory = this.usageHistory.slice(-1000);
  }
  next();
});

export const StorageQuotaModel = mongoose.model<IStorageQuota>('StorageQuota', StorageQuotaSchema);
