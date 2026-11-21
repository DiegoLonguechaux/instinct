import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    tokenVersion: number;
  }

  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    /** Version des sessions de l'utilisateur au moment de la connexion (voir User.tokenVersion). */
    tokenVersion?: number;
    /** Posé quand le compte a été supprimé ou son mot de passe changé : la session est rejetée. */
    invalid?: boolean;
    /** Timestamp (Date.now()) du dernier rafraîchissement du rôle depuis la base. */
    roleCheckedAt?: number;
  }
}
