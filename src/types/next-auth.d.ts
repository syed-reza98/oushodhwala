import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/server/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: AppRole[];
    } & DefaultSession["user"];
  }

  interface User {
    roles?: AppRole[];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    roles?: AppRole[];
  }
}

export {};
