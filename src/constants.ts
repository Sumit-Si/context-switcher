type WhitelistOrigin = string[];

export const WHITELIST_ORIGINS: WhitelistOrigin = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
] as const;

export const DB_NAME: string = "context-switcherDB";

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
