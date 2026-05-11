import z from "zod";
import { AvailableCognitiveLoads, AvailableEmotionalTones, AvailableEnergyLevels, AvailableRitualTypes, AvailableStepTypes, RitualTypeEnum, StepTypeEnum } from "../constants";
import { Types } from "mongoose";

const registerUserPostValidator = z.object({
  username: z
    .string()
    .nonempty("Username is required")
    .lowercase("Username must be in lowercase")
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username must be at most 20 characters long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username must contains only letters, numbers and underscores",
    )
    .trim(),

  email: z
    .email()
    .nonempty("Email is required")
    .max(100, "Email must be at most 100 characters long")
    .lowercase("Email must be in lowercase")
    .trim(),

  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must be at most 20 characters long")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/\d/, "Must contain number")
    .regex(/[!@#$%&]/, "Must contain special character")
    .trim(),
});

// TODO: Add email verification validator
// const emailVerifyGetValidator = z.object({
//   token: z.string()
//     .nonempty("Token is required")
//     .trim(),
// })

const loginUserPostValidator = z.object({
  email: z
    .email()
    .nonempty("Email is required")
    .max(100, "Email must be at most 100 characters long")
    .lowercase("Email must be in lowercase")
    .trim(),

  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must be at most 20 characters long")
    .trim(),
});

const changePasswordPostValidator = z.object({
  currentPassword: z.string()
    .nonempty("Current password is required")
    .trim(),

  newPassword: z.string()
    .nonempty("New password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must be at most 20 characters long")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/\d/, "Must contain number")
    .regex(/[!@#$%&]/, "Must contain special character")
    .trim(),

  confirmPassword: z.string()
    .min(1, "Confirm password is required")
    .trim(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

const forgotPasswordPostValidator = z.object({
  email: z.email()
    .nonempty("Email is required")
    .max(100, "Email must be at most 100 characters long")
    .lowercase("Email must be in lowercase")
    .trim(),
});

const resetPasswordPostValidator = z.object({
  password: z.string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must be at most 20 characters long")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/\d/, "Must contain number")
    .regex(/[!@#$%&]/, "Must contain special character")
    .trim(),
});

// Context Validators
const createContextPostValidator = z.object({
  name: z.string()
    .nonempty("Name is required")
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be at most 50 characters long")
    .trim(),

  description: z.string()
    .max(1000, "Description must be at most 1000 characters long")
    .trim()
    .optional(),

  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .trim(),

  icon: z.string()
    .max(100, "Icon must be at most 100 characters long")
    .trim(),

  cognitiveLoad: z.enum(AvailableCognitiveLoads),

  emotionalTone: z.enum(AvailableEmotionalTones),

  energyRequired: z.enum(AvailableEnergyLevels),

  musicSuggestion: z.string()
    .max(200, "Music Suggestion must be at most 200 characters long")
    .trim()
    .optional(),

  environmentNote: z.string()
    .max(200, "Environment Note must be at most 200 characters long")
    .trim()
    .optional(),

});

const updateContextPatchValidator = z.object({
  color: z.string()
    .max(8, "Color must be at most 8 characters long")
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color")
    .trim(),

  emotionalTone: z.string()
    .max(100, "Emotional Tone must be at most 100 characters long")
    .trim(),

  icon: z.string()
    .max(100, "Icon must be at most 100 characters long")
    .trim(),

  energyRequired: z.string()
    .max(100, "Energy Required must be at most 100 characters long")
    .trim(),

  name: z.string()
    .max(50, "Name must be at most 50 characters long")
    .trim(),

  description: z.string()
    .max(1000, "Description must be at most 1000 characters long")
    .trim(),
})

// Ritual Validators
const createRitualPostValidator = z.object({
  name: z.string()
    .min(1, "Name is required")                          // ← fix 3
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name must be at most 50 characters long")
    .trim(),

  description: z.string()
    .max(1000, "Description must be at most 1000 characters long")
    .optional(),

  ritualType: z.enum(AvailableRitualTypes)
    .default(RitualTypeEnum.CUSTOM),

  totalDuration: z.coerce.number()
    .min(1, "Duration must be at least 1 second")
    .max(3600, "Ritual cannot exceed 60 minutes"),

  steps: z.array(
    z.object({
      type: z.enum(AvailableStepTypes)
        .default(StepTypeEnum.BRAINDUMP),
      duration: z.coerce.number()
        .min(10, "Each step needs at least 10 seconds")
        .max(3600, "Each step cannot exceed 60 minutes"),
      prompt: z.string()
        .max(200, "Prompt must be at most 200 characters long")
        .trim()
        .optional(),
      audioFile: z.string().url("Invalid URL").trim().optional(),  // ← fix 1
    })
  ).min(1, "At least one step is required"),               // ← bonus: empty steps[] would silently pass

  targetTransition: z.object({
    fromContext: z.string().optional(),
    toContext: z.string().optional(),
  }).default({}),                                          // ← fix 2: removed .optional()
});

const updateRitualPatchValidator = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name must be at most 50 characters long")
    .trim()
    .optional(),

  description: z.string()
    .max(1000, "Description must be at most 1000 characters long")
    .trim()
    .optional(),

  steps: z.array(
    z.object({
      type: z.enum(AvailableStepTypes),
      duration: z.number()
        .min(1, "Duration must be at least 1 second"),
      prompt: z.string()
        .min(1, "Prompt must be at least 1 characters long")
        .max(500, "Prompt must be at most 500 characters long")
        .trim(),
      audioFile: z.url()
        .optional(),
    })
  ).min(1).optional(),
});

// SwitchLog Validators
const createSwitchLogPostValidator = z.object({
  fromContext: z.string()
    .nonempty("From context is required")
    .refine(Types.ObjectId.isValid, {
      message: "Invalid fromContext id",
    })
    .trim(),

  toContext: z.string()
    .nonempty("To context is required")
    .refine(Types.ObjectId.isValid, {
      message: "Invalid toContext id",
    })
    .trim(),

  ritualId: z.string()
    .refine(Types.ObjectId.isValid, {
      message: "Invalid ritualId id",
    })
    .optional(),

  ritualCompleted: z.boolean()
    .default(false),

  ritualSkipped: z.boolean()
    .default(false),

  distraction: z.string()
    .max(200, "Distraction must be at most 200 characters long")
    .optional(),

  notes: z.string()
    .max(500, "Notes must be at most 500 characters long")
    .optional(),

  projectTag: z.string()
    .max(50, "Project Tag must be at most 50 characters long")
    .optional(),
});

const updateSwitchLogPatchValidator = z.object({
  distraction: z.string()
    .max(200, "Distraction must be at most 200 characters long")
    .optional(),

  notes: z.string()
    .max(500, "Notes must be at most 500 characters long")
    .optional(),

  projectTag: z.string()
    .max(50, "Project Tag must be at most 50 characters long")
    .optional(),

  focusQuality: z.number()
    .min(1, "Focus Quality must be at least 1")
    .optional(),
});

export { registerUserPostValidator, loginUserPostValidator, changePasswordPostValidator, forgotPasswordPostValidator, resetPasswordPostValidator, createContextPostValidator, updateContextPatchValidator, createRitualPostValidator, updateRitualPatchValidator, createSwitchLogPostValidator, updateSwitchLogPatchValidator };
