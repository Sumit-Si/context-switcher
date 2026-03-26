import mongoose, { Schema, Types } from "mongoose";


export type SwitchLogSchemaProps = {
    userId: Types.ObjectId;
    fromContext: Types.ObjectId;
    toContext: Types.ObjectId;
    startTime: Date;
    endTime?: Date | null;
    durationInMinutes: number;
    ritualId?: Types.ObjectId | null;
    ritualCompleted: boolean;
    ritualSkipped: boolean;
    focusQuality: number;
    distraction?: string;
    notes?: string;
    projectTag?: string;
    deletedAt: Date | null;
}

const switchLogSchema = new Schema<SwitchLogSchemaProps>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    fromContext: {
        type: Schema.Types.ObjectId,
        ref: "Context",
        required: true,
    },
    toContext: {
        type: Schema.Types.ObjectId,
        ref: "Context",
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        default: null,
    },
    durationInMinutes: {
        type: Number,
        required: true,
    },
    ritualId: {
        type: Schema.Types.ObjectId,
        ref: "Ritual",
    },
    ritualCompleted: {
        type: Boolean,
        default: false,
    },
    ritualSkipped: {
        type: Boolean,
        default: false,
    },
    focusQuality: {
        type: Number,
        min: [1, "Focus quality must be at least 1"],
        max: [5, "Focus quality must be at most 5"],
    },
    distraction: {
        type: String,
    },
    notes: {
        type: String,
    },
    projectTag: {
        type: String,
    },
    deletedAt: {
        type: Date,
        default: null,
    }
});

switchLogSchema.index({ userId: 1, startTime: -1 });
switchLogSchema.index({ userId: 1, fromContext: 1, toContext: 1 });


const SwitchLog = mongoose.model<SwitchLogSchemaProps>("SwitchLog", switchLogSchema);

export default SwitchLog;