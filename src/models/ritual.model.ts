import type { Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import {
  AvailableRitualTypes,
  AvailableStepTypes,
  RitualTypeEnum,
  StepTypeEnum,
} from "../constants";
import type {
  RitualType,
  StepsProps,
  TargetTransitionProps,
} from "../types/common.types";

export interface RitualSchemaProps {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  ritualType: RitualType;
  steps: StepsProps[];
  totalDuration: number;
  targetTransition: TargetTransitionProps;
  deletedAt: Date | null;
  usedCount: number;
  isDefault: boolean;
}

const ritualSchema = new Schema<RitualSchemaProps>(
  {
    name: {
      type: String,
      required: true,
      minLength: [2, "Name must be at least 2 characters long"],
      maxLength: [50, "Name must be at most 50 characters long"],
      trim: true,
    },
    description: {
      type: String,
      maxLength: [1000, "Description must be at most 1000 characters long"],
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    totalDuration: {
      type: Number,
      min: [1, "Duration must be at least 1 second"],
      max: [3600, "Duration cannot exceed 60 minutes"], // ← fix: 3600s = 60 min
      default: 300, // ← fix: default 5 min (300s), not 60s
    },
    ritualType: {
      type: String,
      enum: AvailableRitualTypes,
      default: RitualTypeEnum.CUSTOM,
    },
    targetTransition: {
      // ← single object, NOT an array
      fromContext: {
        type: String,
        default: null,
      },
      toContext: {
        type: String,
        default: null,
      },
    },
    steps: [
      {
        type: {
          type: String,
          enum: AvailableStepTypes,
          default: StepTypeEnum.BRAINDUMP,
        },
        duration: {
          type: Number, // seconds
        },
        prompt: {
          type: String,
        },
        audioFile: {
          type: String,
        },
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
      // Incremented each time this ritual is used in a SwitchLog
      // Drives the "Uses" stat on RitualCard
    },

    isDefault: {
      type: Boolean,
      default: false,
      // One ritual can be the user's default — suggested automatically
    },
  },
  {
    timestamps: true,
  },
);

// add sparse: true so null userId entries are excluded from uniqueness check
ritualSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });
ritualSchema.index({ userId: 1, deletedAt: 1 }); // getAllRituals filter
ritualSchema.index({ userId: 1, createdAt: -1 }); // newest first sort
ritualSchema.index({ userId: 1, ritualType: 1 }); // filter by type

const Ritual = mongoose.model<RitualSchemaProps>("Ritual", ritualSchema);

export default Ritual;
