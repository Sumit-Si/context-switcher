import z from "zod";

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
    .max(50, "Name must be at most 50 characters long")
    .trim(),

  description: z.string()
    .max(1000, "Description must be at most 1000 characters long")
    .trim(),

  color: z.string()
    .max(8, "Color must be at most 8 characters long")
    .trim(),

  icon: z.string()
    .max(100, "Icon must be at most 100 characters long")
    .trim(),

  cognitiveLoad: z.number()
    .min(1, "Cognitive Load must be at least 1")
    .max(10, "Cognitive Load must be at most 10"),

  emotionalTone: z.string()
    .max(100, "Emotional Tone must be at most 100 characters long")
    .trim(),

  energyRequired: z.string()
    .max(100, "Energy Required must be at most 100 characters long")
    .trim(),

  musicSuggestion: z.string()
    .max(200, "Music Suggestion must be at most 200 characters long")
    .trim(),

  environmentNote: z.string()
    .max(200, "Environment Note must be at most 200 characters long")
    .trim(),

  isDefault: z.boolean(),
});

const updateContextPutValidator = z.object({
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

export { registerUserPostValidator, loginUserPostValidator, forgotPasswordPostValidator, resetPasswordPostValidator, createContextPostValidator, updateContextPutValidator };
