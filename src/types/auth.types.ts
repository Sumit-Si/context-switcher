import { UserSchemaProps } from "../models/user.model";

export type CreateUserRequestBodyProps = Omit<
  UserSchemaProps,
  "avatar" | "refreshToken"
>;

export type LoginUserRequestBodyProps = Pick<
  UserSchemaProps,
  "email" | "password"
>;

export type UpdateProfileRequestBodyProps = {
  username?: string;
  email?: string;
}

export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge?: number;
};

export type AuthProvider = "local" | "google";
