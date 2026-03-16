import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model";
import config from "./config";


const passportInstance = passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({
            googleId: profile.id,
        });

        if(user) return done(null, user);

        // Check for email exists on local provider account
        user = await User.findOne({
            email: profile.emails?.[0]?.value,
        });

        if(user) {
            user.googleId = profile.id;
            user.authProvider = "google";
            await user.save();
            return done(null, user);
        }

        // Create new user
        user = await User.create({
            username: profile.displayName,
            email: profile.emails?.[0]?.value,
            googleId: profile.id,
            authProvider: "google",
            isEmailVerified: true,
            avatar: profile.photos?.[0]?.value,
        });

        return done(null, user);
    } catch (error) {
        return done(error as Error);
    }
}));

export default passportInstance;