import mongoose, { Schema } from "mongoose";
import config from "../config/config";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

export type PreferenceProps = {
    theme: ["light", "dark"];
    workStartHour: number;
    workEndHour: number;
    notifications: boolean;
    defaultRitual: string;
}

export type UserSchemaProps = {
    username: string;
    email: string;
    password: string;
    avatar?: string;
    refreshToken?: string;
    preferences: PreferenceProps;
    deletedAt?: Date | null;
}


const userSchema = new Schema<UserSchemaProps>({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        trim: true,
        min: [8, "Password must be at least 8 characters long"],
        max: [20, "Password must be at most 20 characters long"],
    },
    avatar: {
        type: String,
    },
    refreshToken: {
        type: String,
    },
    preferences: {
        theme: { type: String, default: "light" },
        workStartHour: { type: String, default: 9 },
        workEndHour: { type: String, default: 18 },
        notifications: { type: Boolean, default: true },
        defaultRitual: { type: String, default: "brain-dump" }
    },
    deletedAt: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true,
});


// Hooks
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
})

userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {

    console.log("accessTokenSec: ", config.ACCESS_TOKEN_SECRET);
    console.log("accessTokenExpiry: ", config.ACCESS_TOKEN_EXPIRY);


    const secret: Secret = config.ACCESS_TOKEN_SECRET;
    const expiresIn = config.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"];

    return jwt.sign({ _id: this._id.toString() }, secret, { expiresIn });
}

userSchema.methods.generateRefreshToken = function () {

    const secret: Secret = config.REFRESH_TOKEN_SECRET;
    const expiresIn = config.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"];

    return jwt.sign({ _id: this._id.toString() }, secret, { expiresIn });
}

const User = mongoose.model<UserSchemaProps>("User", userSchema);

export default User;