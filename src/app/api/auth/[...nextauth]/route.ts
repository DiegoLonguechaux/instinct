import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth-config";
import { verifyLoginChallenge } from "@/lib/auth-challenge";
import dbConnect from "@/lib/db";
import UserModels from "@/models/User";
import NextAuth, { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Durée max pendant laquelle un rôle mis en cache dans le JWT peut rester
// périmé avant d'être revérifié en base (voir callback jwt ci-dessous).
const ROLE_REFRESH_INTERVAL_MS = 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    // Double authentification : ce provider n'accepte PAS le mot de passe.
    // Le mot de passe est vérifié par POST /api/auth/login/start, qui envoie
    // un code par mail ; la session n'existe qu'une fois ce code validé ici.
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        challengeId: { label: "Défi", type: "text" },
        code: { label: "Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.challengeId || !credentials?.code) return null;

        try {
          const user = await verifyLoginChallenge(credentials.challengeId, credentials.code.trim());

          if (!user) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.firstName,
            role: user.role,
            tokenVersion: user.tokenVersion ?? 0,
          };
        } catch (error) {
          // Une erreur ici (ex. Mongo injoignable) est une vraie panne, pas
          // des identifiants invalides : on la journalise et on la
          // propage plutôt que de la faire passer pour un mauvais code.
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
            token.tokenVersion = user.tokenVersion;
            token.roleCheckedAt = Date.now();
            return token;
        }

        if (token.invalid) {
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
                const dbUser = await UserModels.findById(token.id)
                    .select("role tokenVersion")
                    .lean<{ role: string; tokenVersion?: number } | null>();

                // Compte supprimé, ou mot de passe changé/réinitialisé depuis
                // l'émission du token : la session n'est plus valable.
                if (!dbUser || (dbUser.tokenVersion ?? 0) !== (token.tokenVersion ?? 0)) {
                    token.invalid = true;
                    return token;
                }

                token.role = dbUser.role;
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
        if (token.invalid) {
            // Sans `user`, getServerSession() est considérée comme non
            // connectée : requireSession() répond 401.
            return { expires: session.expires } as Session;
        }
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
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
