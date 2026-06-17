import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model";
import config from "./config";
import {
  generateUniqueUsername,
  isMongoUniqueViolation,
} from "../utils/usernameUtils";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
    },
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;
      const rawUserName =
        profile.displayName ||
        `${profile.name?.givenName ?? ""} ${profile.name?.familyName ?? ""}`.trim() ||
        "user";

      if (!email) {
        // Google didn't share an email (rare but possible if scope denied)
        return done(null, false, { message: "No email returned from Google" });
      }
      try {
        // Returning Google User
        const existingGoogleUserId = await User.findOne({
          googleId: profile.id,
        });

        if (existingGoogleUserId) return done(null, existingGoogleUserId);

        // Check for email exists on local provider account
        const existingUserByEmail = await User.findOne({
          email,
        });

        if (existingUserByEmail) {
          // Only merge if this account doesn't already belong to a different
          // OAuth provider — prevents silent account takeover
          if (
            existingUserByEmail.authProvider === "local" ||
            existingUserByEmail.authProvider === "google"
          ) {
            existingUserByEmail.googleId = profile.id;
            existingUserByEmail.authProvider = "google";

            // Opportunistically fill in avatar if missing
            if (!existingUserByEmail.avatar && profile.photos?.[0]?.value) {
              existingUserByEmail.avatar = profile.photos[0].value;
            }

            await existingUserByEmail.save();
            return done(null, existingUserByEmail);
          }

          // Different provider (e.g. GitHub) — don't silently merge
          return done(null, false, {
            message: "Email already registered with a different provider",
          });
        }

        // Create new user
        const username = await generateUniqueUsername(rawUserName);

        const newUser = await User.create({
          username,
          email: profile.emails?.[0]?.value,
          googleId: profile.id,
          authProvider: "google",
          isEmailVerified: true,
          avatar: profile.photos?.[0]?.value,
        });

        return done(null, newUser);
      } catch (error) {
        if (isMongoUniqueViolation(error, "username")) {
          // Extremely rare race: generate a new username and retry once
          try {
            const fallbackUsername = `user${Date.now()}`;
            const retryUser = await User.create({
              username: fallbackUsername,
              email,
              googleId: profile.id,
              authProvider: "google",
              isEmailVerified: true,
              avatar: profile.photos?.[0]?.value,
            });
            return done(null, retryUser);
          } catch (retryError) {
            return done(retryError);
          }
        }
        return done(error);
      }
    },
  ),
);
