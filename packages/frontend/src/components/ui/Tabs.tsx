import { createContext, useContext, useState, type ReactNode, type HTMLAttributes } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  /** Default active tab id */
  defaultTab?: string;
  /** Controlled active tab */
  activeTab?: string;
  /** Tab change callback */
  onTabChange?: (tabId: string) => void;
  /** Tab items */
  children: ReactNode;
}

/**
 * Tabs container component
 * - Keyboard navigation (arrow keys)
 * - Proper ARIA attributes
 */
export function Tabs({
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  children,
  className = '',
  ...props
}: TabsProps): JSX.Element {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || '');
  
  const activeTab = controlledActiveTab ?? internalActiveTab;
  
  const setActiveTab = (id: string): void => {
    if (!controlledActiveTab) {
      setInternalActiveTab(id);
    }
    onTabChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  /** Tab buttons */
  children: ReactNode;
}

export function TabList({
  children,
  className = '',
  ...props
}: TabListProps): JSX.Element {
  return (
    <div
      role="tablist"
      className={`tabs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabProps extends HTMLAttributes<HTMLButtonElement> {
  /** Unique tab identifier */
  id: string;
  /** Tab label */
  children: ReactNode;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Individual tab button component
 */
export function Tab({
  id,
  disabled = false,
  children,
  className = '',
  ...props
}: TabProps): JSX.Element {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('Tab must be used within a Tabs component');
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setActiveTab(id)}
      className={`tab ${isActive ? 'tab-active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Tab id this panel belongs to */
  id: string;
  /** Panel content */
  children: ReactNode;
}

export function TabPanel({
  id,
  children,
  className = '',
  ...props
}: TabPanelProps): JSX.Element | null {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabPanel must be used within a Tabs component');
  }

  const { activeTab } = context;
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={`py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
