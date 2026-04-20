import mongoose, { Schema, Types } from "mongoose";
import { AvailableRitualTypes, AvailableStepTypes, RitualType, RitualTypeEnum, StepTypeEnum } from "../constants";


export type StepType = "breathe" | "braindump" | "move" | "intention" | "pause";
export type StepsProps = {
    type: StepType;
    duration: number;
    prompt: string;
    audioFile?: string;
}

export type TargetTransitionProps = {
    fromContext: string;
    toContext: string;
}

export type RitualSchemaProps = {
    userId: Types.ObjectId;
    name: string;
    description?: string;
    ritualType: RitualType;
    steps: StepsProps[];
    totalDuration: number;
    targetTransition: TargetTransitionProps;
    deletedAt: Date | null;
}

const ritualSchema = new Schema<RitualSchemaProps>({
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
    },
    ritualType: {
        type: String,
        enum: AvailableRitualTypes,
        default: RitualTypeEnum.CUSTOM,
    },
    targetTransition: {
        fromContext: String,
        toContext: String,
    },
    steps: [{
        type: {
            type: String,
            enum: AvailableStepTypes,
            default: StepTypeEnum.BRAINDUMP,
        },
        duration: {
            type: Number,   // seconds
        },
        prompt: {
            type: String,
        },
        audioFile: {
            type: String,
        }
    }],
    deletedAt: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true,
});

ritualSchema.index({ userId: 1, name: 1 }, { unique: true });


const Ritual = mongoose.model<RitualSchemaProps>("Ritual", ritualSchema);

export default Ritual;