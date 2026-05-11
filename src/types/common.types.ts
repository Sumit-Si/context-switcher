import { Types } from "mongoose";
import { AuthProvider } from "./auth.types";

export type UserDocument = {
  _id: Types.ObjectId;
  username: string;
  email: string;
  avatar?: string;
  avatarPublicId?: string;
  authProvider: AuthProvider;
};

export type GetRequestPayloads = {
  page?: string,
  limit?: string,
  sortBy?: string,
  order?: string,
  search?: string,
}

// Context Types
export type CognitiveLoad = "low" | "medium" | "high";
export type EmotionalTone = "calm" | "energetic" | "analytical" | "creative";
export type EnergyLevel = "low" | "medium" | "high";

// Ritual Types
export type RitualType = "custom" | "template";
export type StepType = "breathe" | "braindump" | "move" | "intention" | "pause";

export type StepsProps = {
    type: StepType;
    duration: number;
    prompt: string;
    audioFile?: string;
}

export type TargetTransitionProps = {
    fromContext?: string;
    toContext?: string;
}