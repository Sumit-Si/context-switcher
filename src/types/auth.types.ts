import type { UserSchemaProps } from "../models/user.model";

export type CreateUserRequestBodyProps = Pick<
  UserSchemaProps,
  "username" | "email" | "password"
>;

export type LoginUserRequestBodyProps = Pick<
  UserSchemaProps,
  "email" | "password"
>;

export interface UpdateProfileRequestBodyProps {
  username?: string;
  email?: string;
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge?: number;
  path: string;
}

export type AuthProvider = "local" | "google";
