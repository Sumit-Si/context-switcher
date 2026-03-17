import nodemailer from "nodemailer";
import { UserSchemaProps } from "../models/user.model";
import config from "../config/config";

type UserProps = Pick<UserSchemaProps, "username" | "email">;

const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: false,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

// Send email verification link
const sendVerificationEmail = async (user: UserProps, token: string) => {
  const url = `${config.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"Context Switcher" <${config.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your Context Switcher account",
    html: `
      <div style='font-family:Arial;max-width:600px;margin:auto'>
        <h2 style='color:#1E3A5F'>Welcome, ${user.username}!</h2>
        <p>Click below to verify your email address:</p>
        <a href='${url}' style='background:#2E86AB;color:white;
           padding:12px 24px;text-decoration:none;border-radius:6px'>
          Verify Email
        </a>
        <p style='color:#888;margin-top:20px'>Link expires in 24 hours.</p>
      </div>`,
  });
};

// Send password reset link
const sendPasswordResetEmail = async (user: UserProps, token: string) => {
  const url = `${config.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Context Switcher" <${config.EMAIL_USER}>`,
    to: user.email,
    subject: "Reset your Context Switcher password",
    html: `
      <div style='font-family:Arial;max-width:600px;margin:auto'>
        <h2 style='color:#1E3A5F'>Password Reset Request</h2>
        <p>Click below to reset your password. This link expires in 10 minutes.</p>
        <a href='${url}' style='background:#C0392B;color:white;
           padding:12px 24px;text-decoration:none;border-radius:6px'>
          Reset Password
        </a>
        <p style='color:#888;margin-top:20px'>
          If you did not request this, ignore this email.
        </p>
      </div>`,
  });
};

export { sendVerificationEmail, sendPasswordResetEmail };
