import dbConnect from "@/lib/db";
import UserModels from "@/models/User";
import bcrypt from "bcryptjs";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Durée max pendant laquelle un rôle mis en cache dans le JWT peut rester
// périmé avant d'être revérifié en base (voir callback jwt ci-dessous).
const ROLE_REFRESH_INTERVAL_MS = 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "votre@email.com" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();

        await dbConnect();

        try {
          const user = await UserModels.findOne({ email });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.firstName,
            role: user.role,
          };
        } catch (error) {
          // Une erreur ici (ex. Mongo injoignable) est une vraie panne, pas
          // des identifiants invalides : on la journalise et on la
          // propage plutôt que de la faire passer pour un mauvais mot de
          // passe.
          console.error("Auth error:", error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
            // Connexion : on part des infos fraîchement lues en base.
            token.role = user.role;
            token.id = user.id;
            token.roleCheckedAt = Date.now();
            return token;
        }

        // Requêtes suivantes : le rôle vit dans le JWT (strategy "jwt"), donc
        // une rétrogradation/suppression décidée par un super-admin ne
        // serait normalement jamais revue tant que le token n'expire pas.
        // On le revérifie en base à intervalle limité pour borner cette
        // fenêtre de désynchronisation sans taper la DB à chaque requête.
        const lastChecked = typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
        if (token.id && Date.now() - lastChecked > ROLE_REFRESH_INTERVAL_MS) {
            try {
                await dbConnect();
                const dbUser = await UserModels.findById(token.id).select("role").lean<{ role: string } | null>();
                if (dbUser?.role) {
                    token.role = dbUser.role;
                }
                token.roleCheckedAt = Date.now();
            } catch (error) {
                console.error("JWT role refresh error:", error);
                // En cas de panne DB ponctuelle, on garde le rôle en cache
                // plutôt que de casser toutes les sessions actives.
            }
        }

        return token;
    },
    async session({ session, token }) {
        if (session.user) {
            session.user.role = token.role;
            session.user.id = token.id;
        }
        return session;
    }
  },
  pages: {
    signIn: "/login",
    error: '/login' // Error code passed in url query string as ?error=
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
