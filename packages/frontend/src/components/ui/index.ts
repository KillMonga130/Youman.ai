/**
 * AI Humanizer Design System - UI Components
 * WCAG AAA Compliant Component Library
 * NO PURPLE - Uses blue, gray, green, amber, red, teal
 */

// Core Components
export { Button, type ButtonProps } from './Button';
export { Input, type InputProps } from './Input';
export { Select, type SelectProps, type SelectOption } from './Select';
export { Textarea, type TextareaProps } from './Textarea';
export { Checkbox, type CheckboxProps } from './Checkbox';

// Display Components
export { Badge, type BadgeProps } from './Badge';
export { Alert, type AlertProps } from './Alert';
export { Card, CardHeader, CardBody, CardFooter, type CardProps } from './Card';
export { Avatar, type AvatarProps } from './Avatar';
export { Progress, type ProgressProps } from './Progress';
export { Spinner, type SpinnerProps } from './Spinner';

// Interactive Components
export { Toggle, type ToggleProps } from './Toggle';
export { Modal, type ModalProps } from './Modal';
export { Tooltip, type TooltipProps } from './Tooltip';
export { Tabs, TabList, Tab, TabPanel, type TabsProps, type TabProps } from './Tabs';

// File Upload
export {
  FileUpload,
  type FileUploadProps,
  type UploadedFile,
  type SupportedFormat,
  type UploadStatus,
} from './FileUpload';

// Protected Segments
export {
  ProtectedSegments,
  type ProtectedSegment,
} from './ProtectedSegments';

// Theme
export { ThemeProvider, useTheme } from './ThemeProvider';
export * from './theme';
