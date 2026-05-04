import { AuthProvider } from "./types/auth.types";

type WhitelistOrigin = string[];

export const WHITELIST_ORIGINS: WhitelistOrigin = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
] as const;

export const DB_NAME: string = "context-switcherDB";

// Auth Provider
export const AuthProviderEnum = {
  LOCAL: "local",
  GOOGLE: "google",
} as const;

export const AvailableAuthProviders = Object.values(AuthProviderEnum) as readonly AuthProvider[];

// Context Constants
export type EmotionalTone = "calm" | "energetic" | "analytical" | "creative";
export type EnergyLevel = "low" | "medium" | "high";

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
export type RitualType = "custom" | "template";

export const RitualTypeEnum = {
  CUSTOM: "custom",
  TEMPLATE: "template",
} as const;

export const AvailableRitualTypes = Object.values(RitualTypeEnum) as readonly RitualType[];

export type StepType = "breathe" | "braindump" | "move" | "intention" | "pause";

export const StepTypeEnum = {
  BREATHE: "breathe",
  BRAINDUMP: "braindump",
  MOVE: "move",
  INTENTION: "intention",
  PAUSE: "pause",
} as const;

export const AvailableStepTypes = Object.values(StepTypeEnum) as readonly StepType[];
