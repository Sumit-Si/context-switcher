import { z } from "zod";
import { WHITELIST_ORIGINS } from "../constants";

const envSchema = z.object({
  PORT: z
    .string()
    .default("8000")
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  MONGO_URI: z
    .string({ error: "MONGO_URI is required" })
    .min(1, "MONGO_URI cannot be empty"),

  ACCESS_TOKEN_SECRET: z
    .string({ error: "ACCESS_TOKEN_SECRET is required" })
    .min(16, "ACCESS_TOKEN_SECRET must be at least 16 characters"),

  ACCESS_TOKEN_EXPIRY: z
    .string({ error: "ACCESS_TOKEN_EXPIRY is required" })
    .regex(/^\d+[smhd]$/, "ACCESS_TOKEN_EXPIRY must be like '1d', '15m', '2h'"),

  REFRESH_TOKEN_SECRET: z
    .string({ error: "REFRESH_TOKEN_SECRET is required" })
    .min(16, "REFRESH_TOKEN_SECRET must be at least 16 characters"),

  REFRESH_TOKEN_EXPIRY: z
    .string({ error: "REFRESH_TOKEN_EXPIRY is required" })
    .regex(/^\d+[smhd]$/, "REFRESH_TOKEN_EXPIRY must be like '7d', '30d'"),

  EMAIL_HOST: z
    .string({ error: "EMAIL_HOST is required" })
    .min(1, "EMAIL_HOST cannot be empty"),

  EMAIL_PORT: z
    .string({ error: "EMAIL_PORT is required" })
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),

  EMAIL_USER: z
    .string({ error: "EMAIL_USER is required" })
    .min(1, "EMAIL_USER cannot be empty"),

  EMAIL_PASS: z
    .string({ error: "EMAIL_PASS is required" })
    .min(1, "EMAIL_PASS cannot be empty"),

  CLIENT_URL: z
    .url({error: "CLIENT_URL must be a valid URL"}),

  GOOGLE_CLIENT_ID: z
    .string({ error: "GOOGLE_CLIENT_ID is required" })
    .min(1, "GOOGLE_CLIENT_ID cannot be empty"),

  GOOGLE_CLIENT_SECRET: z
    .string({ error: "GOOGLE_CLIENT_SECRET is required" })
    .min(1, "GOOGLE_CLIENT_SECRET cannot be empty"),

  GOOGLE_CALLBACK_URL: z
    .url({error: "GOOGLE_CALLBACK_URL must be a valid URL"}),

  CLOUDINARY_CLOUD_NAME: z
    .string({ error: "CLOUDINARY_CLOUD_NAME is required" })
    .min(1, "CLOUDINARY_CLOUD_NAME cannot be empty"),

  CLOUDINARY_API_KEY: z
    .string({ error: "CLOUDINARY_API_KEY is required" })
    .min(1, "CLOUDINARY_API_KEY cannot be empty"),

  CLOUDINARY_API_SECRET: z
    .string({ error: "CLOUDINARY_API_SECRET is required" })
    .min(1, "CLOUDINARY_API_SECRET cannot be empty"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const config = {
  ...parsedEnv.data,
  WHITELIST_ORIGINS,
} as const;

export type Config = typeof config;

export default config;
