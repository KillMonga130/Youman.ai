import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { Button } from './ui/Button';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
};

const colorMap = {
  info: 'text-blue-600 dark:text-blue-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString();
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationPanelProps): JSX.Element | null {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop - positioned first so it's behind the panel */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel - positioned on top */}
      <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">
          <div className="card shadow-2xl m-4 max-h-[calc(100vh-2rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-sm btn-icon"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => {
                    const Icon = iconMap[notification.type];
                    const isUnread = !notification.read;
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          isUnread ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            onMarkAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 ${colorMap[notification.type]}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3 className={`text-sm font-medium ${
                                  isUnread 
                                    ? 'text-gray-900 dark:text-white' 
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                  {formatTimeAgo(notification.timestamp)}
                                </p>
                              </div>
                              {isUnread && (
                                <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(notification.id);
                                }}
                                className="btn btn-ghost btn-sm btn-icon flex-shrink-0"
                                aria-label="Delete notification"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

