"use server";

import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/server/auth/config";
import { db } from "@/server/db";
import { profiles, userRoles, users } from "@/server/db/schema";

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
