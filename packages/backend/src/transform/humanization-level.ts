/**
 * Humanization Level Controller
 * Manages humanization level settings and transformation intensity calculations.
 * Requirements: 3
 *
 * Acceptance Criteria:
 * - 3.1: Accept levels from 1 (minimal) to 5 (maximum transformation)
 * - 3.2: Level 1 applies subtle changes affecting less than 20% of sentences
 * - 3.3: Level 5 applies aggressive transformations affecting more than 60% of sentences
 * - 3.4: Default to level 3 (moderate transformation) when no level is specified
 * - 3.5: Preserve all factual information and core arguments from the input
 */

import { HumanizationLevel } from './types';

/** Default humanization level when none is specified */
export const DEFAULT_HUMANIZATION_LEVEL: HumanizationLevel = 3;

/** Minimum valid humanization level */
export const MIN_HUMANIZATION_LEVEL = 1;

/** Maximum valid humanization level */
export const MAX_HUMANIZATION_LEVEL = 5;

/**
 * Level configuration defining transformation intensity parameters
 */
export interface LevelConfiguration {
  /** The humanization level (1-5) */
  level: HumanizationLevel;
  /** Target minimum modification percentage for sentences */
  minModificationPercent: number;
  /** Target maximum modification percentage for sentences */
  maxModificationPercent: number;
  /** Transformation intensity factor (0-1) */
  intensityFactor: number;
  /** Description of the level */
  description: string;
}

/**
 * Modification tracking result
 */
export interface ModificationTracking {
  /** Total number of sentences */
  totalSentences: number;
  /** Number of sentences modified */
  modifiedSentences: number;
  /** Modification percentage */
  modificationPercentage: number;
  /** Whether the modification meets the level target */
  meetsLevelTarget: boolean;
  /** Target range for this level */
  targetRange: { min: number; max: number };
}

/**
 * Level validation result
 */
export interface LevelValidationResult {
  /** Whether the level is valid */
  isValid: boolean;
  /** The validated/normalized level */
  level: HumanizationLevel;
  /** Error message if invalid */
  errorMessage?: string;
}

/**
 * Pre-defined level configurations based on requirements
 * Level 1: < 20% modification (subtle changes)
 * Level 2: 20-35% modification (light changes)
 * Level 3: 35-50% modification (moderate changes) - DEFAULT
 * Level 4: 50-60% modification (significant changes)
 * Level 5: > 60% modification (aggressive changes)
 */
const LEVEL_CONFIGURATIONS: Record<HumanizationLevel, LevelConfiguration> = {
  1: {
    level: 1,
    minModificationPercent: 0,
    maxModificationPercent: 20,
    intensityFactor: 0.15,
    description: 'Minimal transformation - subtle changes affecting less than 20% of sentences',
  },
  2: {
    level: 2,
    minModificationPercent: 20,
    maxModificationPercent: 35,
    intensityFactor: 0.30,
    description: 'Light transformation - noticeable but conservative changes',
  },
  3: {
    level: 3,
    minModificationPercent: 35,
    maxModificationPercent: 50,
    intensityFactor: 0.45,
    description: 'Moderate transformation - balanced humanization (default)',
  },
  4: {
    level: 4,
    minModificationPercent: 50,
    maxModificationPercent: 60,
    intensityFactor: 0.60,
    description: 'Significant transformation - substantial changes to most content',
  },
  5: {
    level: 5,
    minModificationPercent: 60,
    maxModificationPercent: 100,
    intensityFactor: 0.80,
    description: 'Maximum transformation - aggressive changes affecting more than 60% of sentences',
  },
};

/**
 * Humanization Level Controller
 * Manages level validation, intensity calculation, and modification tracking.
 */
export class HumanizationLevelController {
  private currentLevel: HumanizationLevel;
  private configuration: LevelConfiguration;

  constructor(level?: HumanizationLevel | number) {
    const validationResult = this.validateLevel(level);
    this.currentLevel = validationResult.level;
    this.configuration = LEVEL_CONFIGURATIONS[this.currentLevel];
  }

  /**
   * Validates a humanization level value
   * Requirements: 3.1, 3.4
   *
   * @param level - The level to validate (can be undefined, number, or HumanizationLevel)
   * @returns Validation result with normalized level
   */
  validateLevel(level?: HumanizationLevel | number): LevelValidationResult {
    // Default to level 3 if not specified (Requirement 3.4)
    if (level === undefined || level === null) {
      return {
        isValid: true,
        level: DEFAULT_HUMANIZATION_LEVEL,
      };
    }

    // Check if level is a valid number
    if (typeof level !== 'number' || !Number.isInteger(level)) {
      return {
        isValid: false,
        level: DEFAULT_HUMANIZATION_LEVEL,
        errorMessage: `Humanization level must be an integer between ${MIN_HUMANIZATION_LEVEL} and ${MAX_HUMANIZATION_LEVEL}`,
      };
    }

    // Check if level is within valid range (Requirement 3.1)
    if (level < MIN_HUMANIZATION_LEVEL || level > MAX_HUMANIZATION_LEVEL) {
      return {
        isValid: false,
        level: DEFAULT_HUMANIZATION_LEVEL,
        errorMessage: `Humanization level must be between ${MIN_HUMANIZATION_LEVEL} and ${MAX_HUMANIZATION_LEVEL}, got ${level}`,
      };
    }

    return {
      isValid: true,
      level: level as HumanizationLevel,
    };
  }

  /**
   * Gets the current humanization level
   */
  getLevel(): HumanizationLevel {
    return this.currentLevel;
  }

  /**
   * Sets a new humanization level
   * @param level - The new level to set
   * @throws Error if level is invalid
   */
  setLevel(level: HumanizationLevel | number): void {
    const validationResult = this.validateLevel(level);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
    }
    this.currentLevel = validationResult.level;
    this.configuration = LEVEL_CONFIGURATIONS[this.currentLevel];
  }

  /**
   * Gets the configuration for the current level
   */
  getConfiguration(): LevelConfiguration {
    return { ...this.configuration };
  }

  /**
   * Gets the configuration for a specific level
   * @param level - The level to get configuration for
   */
  static getConfigurationForLevel(level: HumanizationLevel): LevelConfiguration {
    return { ...LEVEL_CONFIGURATIONS[level] };
  }

  /**
   * Calculates the transformation intensity factor for the current level
   * This factor is used by transformation strategies to determine how aggressively to transform text.
   *
   * @returns Intensity factor between 0 and 1
   */
  calculateIntensity(): number {
    return this.configuration.intensityFactor;
  }

  /**
   * Calculates the transformation intensity for a specific level
   * @param level - The humanization level
   * @returns Intensity factor between 0 and 1
   */
  static calculateIntensityForLevel(level: HumanizationLevel): number {
    return LEVEL_CONFIGURATIONS[level].intensityFactor;
  }

  /**
   * Calculates the target modification percentage range for the current level
   * @returns Object with min and max modification percentages
   */
  getTargetModificationRange(): { min: number; max: number } {
    return {
      min: this.configuration.minModificationPercent,
      max: this.configuration.maxModificationPercent,
    };
  }

  /**
   * Tracks modification percentage and validates against level targets
   * Requirements: 3.2, 3.3
   *
   * @param totalSentences - Total number of sentences in the text
   * @param modifiedSentences - Number of sentences that were modified
   * @returns Modification tracking result
   */
  trackModification(totalSentences: number, modifiedSentences: number): ModificationTracking {
    if (totalSentences <= 0) {
      return {
        totalSentences: 0,
        modifiedSentences: 0,
        modificationPercentage: 0,
        meetsLevelTarget: true,
        targetRange: this.getTargetModificationRange(),
      };
    }

    const modificationPercentage = (modifiedSentences / totalSentences) * 100;
    const targetRange = this.getTargetModificationRange();

    // Check if modification meets level target
    // Level 1: should be < 20% (Requirement 3.2)
    // Level 5: should be > 60% (Requirement 3.3)
    let meetsLevelTarget: boolean;
    if (this.currentLevel === 1) {
      meetsLevelTarget = modificationPercentage < targetRange.max;
    } else if (this.currentLevel === 5) {
      meetsLevelTarget = modificationPercentage > targetRange.min;
    } else {
      meetsLevelTarget =
        modificationPercentage >= targetRange.min &&
        modificationPercentage <= targetRange.max;
    }

    return {
      totalSentences,
      modifiedSentences,
      modificationPercentage: Math.round(modificationPercentage * 100) / 100,
      meetsLevelTarget,
      targetRange,
    };
  }

  /**
   * Calculates the number of sentences to modify based on the level
   * @param totalSentences - Total number of sentences
   * @returns Target number of sentences to modify
   */
  calculateTargetModifications(totalSentences: number): number {
    if (totalSentences <= 0) return 0;

    // Use the midpoint of the target range as the target
    const targetRange = this.getTargetModificationRange();
    const targetPercent = (targetRange.min + targetRange.max) / 2 / 100;

    return Math.round(totalSentences * targetPercent);
  }

  /**
   * Determines if a sentence should be modified based on the current level
   * Uses a probabilistic approach based on the intensity factor
   *
   * @param sentenceIndex - Index of the sentence (for deterministic behavior in tests)
   * @param totalSentences - Total number of sentences
   * @param seed - Optional seed for deterministic behavior
   * @returns Whether the sentence should be modified
   */
  shouldModifySentence(
    sentenceIndex: number,
    totalSentences: number,
    seed?: number
  ): boolean {
    if (totalSentences <= 0) return false;

    // Use intensity factor as the probability of modification
    const intensity = this.calculateIntensity();

    // For deterministic behavior (useful in tests), use the seed
    if (seed !== undefined) {
      const hash = (sentenceIndex * 31 + seed) % 100;
      return hash < intensity * 100;
    }

    // For normal operation, use random selection
    return Math.random() < intensity;
  }

  /**
   * Gets a description of the current level
   */
  getDescription(): string {
    return this.configuration.description;
  }

  /**
   * Gets all available level configurations
   */
  static getAllConfigurations(): LevelConfiguration[] {
    return Object.values(LEVEL_CONFIGURATIONS);
  }

  /**
   * Checks if a level value is valid
   * @param level - The level to check
   */
  static isValidLevel(level: unknown): level is HumanizationLevel {
    return (
      typeof level === 'number' &&
      Number.isInteger(level) &&
      level >= MIN_HUMANIZATION_LEVEL &&
      level <= MAX_HUMANIZATION_LEVEL
    );
  }
}

/**
 * Creates a new HumanizationLevelController instance
 * @param level - Optional initial level (defaults to 3)
 */
export function createHumanizationLevelController(
  level?: HumanizationLevel | number
): HumanizationLevelController {
  return new HumanizationLevelController(level);
}

/**
 * Validates a humanization level and returns the normalized value
 * Convenience function for quick validation
 *
 * @param level - The level to validate
 * @returns The validated level (defaults to 3 if invalid)
 */
export function validateHumanizationLevel(
  level?: HumanizationLevel | number
): HumanizationLevel {
  const controller = new HumanizationLevelController(level);
  return controller.getLevel();
}

/**
 * Gets the intensity factor for a humanization level
 * Convenience function for quick intensity lookup
 *
 * @param level - The humanization level
 * @returns Intensity factor between 0 and 1
 */
export function getIntensityForLevel(level: HumanizationLevel): number {
  return HumanizationLevelController.calculateIntensityForLevel(level);
}
