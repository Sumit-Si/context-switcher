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
})

export { registerUserPostValidator, loginUserPostValidator,forgotPasswordPostValidator, resetPasswordPostValidator };
