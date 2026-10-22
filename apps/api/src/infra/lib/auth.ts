import * as schema from "@growmate/db";
import { db } from "@growmate/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP, magicLink, twoFactor } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";
import { redis } from "./redis";

const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET || "growmate-e2e-secret-key-32-characters-minimum-length";
const betterAuthUrl = process.env.BETTER_AUTH_URL || "http://localhost:5003";
const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5003";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const resendApiKey = process.env.RESEND_API_KEY || "re_mock_api_key";

const resend = new Resend(resendApiKey);

// Local SMTP transporter pointing to Mailpit (port 1025)
const localTransporter = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 1025,
  secure: false,
});

/**
 * Smart email dispatcher: routes to Mailpit in local dev, Resend in prod
 */
export async function sendSmartEmail(to: string, subject: string, html: string) {
  if (process.env.NODE_ENV === "development" || !process.env.RESEND_API_KEY) {
    try {
      await localTransporter.sendMail({
        from: "GrowMate Store <dev@localhost>",
        to,
        subject,
        html,
      });
      logger.info({ to, subject }, "[Mailpit] Intercepted outgoing store email");
    } catch (err: any) {
      logger.warn({ err: err.message }, "[Mailpit] Local SMTP delivery skipped, check Docker Mailpit");
    }
  } else {
    try {
      await resend.emails.send({
        from: "GrowMate Store <security@growmate.pet>",
        to,
        subject,
        html,
      });
    } catch (err: any) {
      logger.error({ err: err.message, to }, "Failed to send email via Resend");
    }
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactor,
    },
  }),
  secret: betterAuthSecret,
  baseURL: betterAuthUrl,
  trustedOrigins: Array.from(
    new Set(
      [
        nextPublicAppUrl.replace(/['"]/g, "").replace(/\/+$/, ""),
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5003",
        "http://localhost:5002",
        "http://localhost:8080",
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
          ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
          : []),
      ].filter(Boolean),
    ),
  ),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  secondaryStorage: {
    get: async (key) => {
      try {
        const value = await redis.get(key);
        return value ?? null;
      } catch {
        return null;
      }
    },
    set: async (key, value, ttl) => {
      try {
        if (ttl) {
          await redis.set(key, value, "EX", ttl);
        } else {
          await redis.set(key, value);
        }
      } catch {}
    },
    delete: async (key) => {
      try {
        await redis.del(key);
      } catch {}
    },
    getAndDelete: async (key) => {
      try {
        const val = await redis.get(key);
        if (val) await redis.del(key);
        return val ?? null;
      } catch {
        return null;
      }
    },
    increment: async (key, amount = 1) => {
      try {
        return await redis.incrby(key, amount);
      } catch {
        return 0;
      }
    },
  },

  rateLimit: {
    storage: "secondary-storage",
    window: 60,
    max: 120,
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, token }) => {
      const appUrl = nextPublicAppUrl.replace(/['"]/g, "").replace(/\/+$/, "");
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await sendSmartEmail(
        user.email,
        "Reset your GrowMate password",
        `<div style="font-family: sans-serif; padding: 20px;">
           <h2>Password Reset Request</h2>
           <p>Click the button below to reset your GrowMate store password. This link expires in 15 minutes.</p>
           <a href="${resetUrl}" style="display:inline-block; padding: 10px 20px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 6px; margin: 15px 0;">Reset Password</a>
           <p>Or paste this link in your browser: ${resetUrl}</p>
         </div>`,
      );
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendSmartEmail(
          email,
          "Your GrowMate Login Link",
          `<div style="font-family: sans-serif; padding: 20px;">
             <h2>Passwordless Sign In</h2>
             <p>Click <a href="${url}">here</a> to sign in directly to your GrowMate account.</p>
           </div>`,
        );
      },
      expiresIn: 60 * 15,
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendSmartEmail(
          email,
          "GrowMate - Security Passcode",
          `<div style="font-family: sans-serif; padding: 20px;">
             <h2>Security Verification</h2>
             <p>Your one-time passcode is:</p>
             <h1 style="letter-spacing: 5px; background: #f3f4f6; padding: 10px; display: inline-block;">${otp}</h1>
             <p>This code expires in 5 minutes.</p>
           </div>`,
        );
      },
    }),
    twoFactor({
      issuer: "GrowMate",
      providerOptions: {
        totp: {},
        email: {
          sendOTP: async ({ user, otp }: { user: { email: string }; otp: string }) => {
            await sendSmartEmail(
              user.email,
              "GrowMate - 2FA Security Code",
              `<div style="font-family: sans-serif; padding: 20px;">
                 <h2>Store Staff 2FA Verification</h2>
                 <p>Your two-factor verification code is:</p>
                 <h1 style="letter-spacing: 5px; background: #f3f4f6; padding: 10px; display: inline-block;">${otp}</h1>
                 <p>This code expires in 5 minutes.</p>
               </div>`,
            );
          },
        },
      },
    }),
  ],
});

export type Auth = typeof auth;
