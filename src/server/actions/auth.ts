"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/server/auth/config";
import { db } from "@/server/db";
import { passwordResetTokens, profiles, userRoles, users } from "@/server/db/schema";
import { sendEmail } from "@/server/email/send";

function tokenHash(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || input.password.length < 6) {
    return { ok: false as const, error: "Invalid email or password" };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length) {
    return { ok: false as const, error: "Email already registered" };
  }

  const id = randomUUID();
  const passwordHash = await hash(input.password, 10);
  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name: input.name ?? null,
  });
  await db.insert(profiles).values({
    id,
    fullName: input.name ?? null,
    phone: input.phone ?? null,
  });
  await db.insert(userRoles).values({
    id: randomUUID(),
    userId: id,
    role: "user",
  });

  return { ok: true as const, userId: id };
}

export async function loginUser(input: { email: string; password: string }) {
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false as const, error: "Invalid credentials" };
    }
    throw err;
  }
}

/** Creates a reset token and emails a link (console fallback when no mailer configured). */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { ok: false as const, error: "Email required" };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Always claim success to avoid email enumeration
  if (!user) return { ok: true as const, token: null as string | null };

  const raw = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash: tokenHash(raw),
    expiresAt: expires.toISOString().slice(0, 23).replace("T", " "),
  });

  const origin = (process.env.PUBLIC_ORIGIN || process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(raw)}`;

  await sendEmail({
    to: email,
    subject: "Reset your Oushodhwala password",
    text: `Reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });

  // Dev convenience: return raw token only outside production
  return {
    ok: true as const,
    token: process.env.NODE_ENV === "production" ? null : raw,
  };
}

export async function resetPasswordWithToken(input: { token: string; password: string }) {
  if (!input.token || input.password.length < 6) {
    return { ok: false as const, error: "Invalid token or password" };
  }

  const now = new Date().toISOString().slice(0, 23).replace("T", " ");
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash(input.token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return { ok: false as const, error: "Token expired or invalid" };

  const passwordHash = await hash(input.password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, row.id));

  return { ok: true as const };
}
