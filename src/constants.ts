import config from "./config/config";
import type { AuthProvider } from "./types/auth.types";
import type { CognitiveLoad, EmotionalTone, EnergyLevel, RitualType, StepType } from "./types/common.types";

type WhitelistOrigin = string[];

export const WHITELIST_ORIGINS: WhitelistOrigin = config.CLIENT_URL
  ? [config.CLIENT_URL, "http://localhost:5173"]
  : ["http://localhost:5173"];

export const DB_NAME: string = "context-switcherDB";

// Auth Provider
export const AuthProviderEnum = {
  LOCAL: "local",
  GOOGLE: "google",
} as const;

export const AvailableAuthProviders = Object.values(AuthProviderEnum) as readonly AuthProvider[];

// Context Constants
export const CognitiveLoadEnum = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export const AvailableCognitiveLoads = Object.values(CognitiveLoadEnum) as readonly CognitiveLoad[];

export const EmotionalTonesEnum = {
  CALM: "calm",
  ENERGETIC: "energetic",
  ANALYTICAL: "analytical",
  CREATIVE: "creative",
} as const;

export const AvailableEmotionalTones = Object.values(EmotionalTonesEnum) as readonly EmotionalTone[];

export const EnergyLevelEnum = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export const AvailableEnergyLevels = Object.values(EnergyLevelEnum) as readonly EnergyLevel[];

// Ritual Constants
export const RitualTypeEnum = {
  CUSTOM: "custom",
  TEMPLATE: "template",
} as const;

export const AvailableRitualTypes = Object.values(RitualTypeEnum) as readonly RitualType[];

export const StepTypeEnum = {
  BREATHE: "breathe",
  BRAINDUMP: "braindump",
  MOVE: "move",
  INTENTION: "intention",
  PAUSE: "pause",
} as const;

export const AvailableStepTypes = Object.values(StepTypeEnum) as readonly StepType[];
