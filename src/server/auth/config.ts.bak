import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users, userRoles } from "@/server/db/schema";
import type { AppRole } from "@/server/auth/roles";

export type { AppRole };

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const [row] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!row) return null;

        const ok = await compare(password, row.passwordHash);
        if (!ok) return null;

        const roles = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, row.id));

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          roles: roles.map((r) => r.role as AppRole),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // roles attached via authorize()
        token.roles = (user as { roles?: AppRole[] }).roles ?? ["user"];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        (session.user as { roles?: AppRole[] }).roles =
          (token.roles as AppRole[] | undefined) ?? ["user"];
      }
      return session;
    },
  },
});
