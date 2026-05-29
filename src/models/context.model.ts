import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import {
  AvailableCognitiveLoads,
  AvailableEmotionalTones,
  AvailableEnergyLevels,
  CognitiveLoadEnum,
  EmotionalTonesEnum,
  EnergyLevelEnum,
} from "../constants";
import type {
  CognitiveLoad,
  EmotionalTone,
  EnergyLevel,
} from "../types/common.types";

export interface ContextSchemaProps {
  userId: Types.ObjectId;
  name: string;
  color: string;
  icon: string;
  description?: string;
  cognitiveLoad: CognitiveLoad;
  emotionalTone: EmotionalTone;
  energyRequired: EnergyLevel;
  musicSuggestion?: string;
  environmentNote?: string;
  isDefault: boolean;
  deletedAt: Date | null;
}

const contextSchema = new Schema<ContextSchemaProps>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [3, "Name must be at least 3 characters long"],
      maxLength: [50, "Name must be at most 50 characters long"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be at most 1000 characters long"],
    },
    color: {
      type: String,
      default: "#2E86AB",
      match: [/^#[0-9A-F]{6}$/i, "Invalid color format"],
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      required: [true, "Icon is required"],
    },
    cognitiveLoad: {
      type: String,
      enum: AvailableCognitiveLoads,
      default: CognitiveLoadEnum.LOW,
    },
    emotionalTone: {
      type: String,
      enum: AvailableEmotionalTones,
      default: EmotionalTonesEnum.CALM,
    },
    energyRequired: {
      type: String,
      enum: AvailableEnergyLevels,
      default: EnergyLevelEnum.LOW,
    },
    musicSuggestion: {
      type: String,
      trim: true,
      maxlength: [200, "Music suggestion must be at most 200 characters long"],
    },
    environmentNote: {
      type: String,
      trim: true,
      maxlength: [200, "Environment note must be at most 200 characters long"],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

contextSchema.index({ userId: 1, name: 1 }, { unique: true });
contextSchema.index({ userId: 1, deletedAt: 1 });
contextSchema.index({ userId: 1, createdAt: -1 });
contextSchema.index({ name: "text", description: "text" }); // Text search

const Context = mongoose.model<ContextSchemaProps>("Context", contextSchema);

export default Context;
