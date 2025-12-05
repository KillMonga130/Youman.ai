import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  status: 'draft' | 'processing' | 'completed';
  detectionScore?: number;
}

export type ColorBlindnessMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: number; // 100 = default, up to 200
  colorBlindnessMode: ColorBlindnessMode;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
}

export interface UserSettings {
  defaultLevel: number;
  defaultStrategy: 'casual' | 'professional' | 'academic' | 'auto';
  defaultLanguage: string;
  autoSave: boolean;
  accessibility: AccessibilitySettings;
}

interface AppState {
  // User
  user: { id: string; email: string; name: string } | null;
  setUser: (user: AppState['user']) => void;
  
  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Current editor state
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  originalText: string;
  setOriginalText: (text: string) => void;
  humanizedText: string;
  setHumanizedText: (text: string) => void;
  
  // Settings
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),
      
      // Projects
      projects: [],
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),
      
      // Current editor state
      currentProjectId: null,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      originalText: '',
      setOriginalText: (text) => set({ originalText: text }),
      humanizedText: '',
      setHumanizedText: (text) => set({ humanizedText: text }),
      
      // Settings - The Necromancer's Quill (always dark Halloween theme)
      settings: {
        defaultLevel: 3,
        defaultStrategy: 'auto',
        defaultLanguage: 'en',
        autoSave: true,
        accessibility: {
          highContrast: false,
          fontSize: 100,
          colorBlindnessMode: 'none',
          reduceMotion: false,
          screenReaderOptimized: false,
        },
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
            accessibility: {
              ...state.settings.accessibility,
              ...(newSettings.accessibility || {}),
            },
          },
        })),
      
      // UI state
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'ai-humanizer-storage',
      partialize: (state) => ({
        settings: state.settings,
        user: state.user,
      }),
    }
  )
);
