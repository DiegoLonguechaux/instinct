import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// withAuth() sans options utilise la page de connexion par défaut de
// NextAuth (/api/auth/signin) et ne protège que ce que son "authorized"
// callback laisse passer, ce qui ne couvre pas les routes API. On définit
// donc explicitement :
// - la page de connexion custom (/login)
// - un comportement différent pour /admin/** (redirection HTML) et
//   /api/admin/** (401 JSON, pour ne pas casser les appels fetch() côté
//   client qui attendent une réponse JSON)
export default withAuth(
  function middleware(req) {
    if (req.nextauth.token) {
      return NextResponse.next()
    }

    if (req.nextUrl.pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      // On gère nous-mêmes la redirection/le 401 ci-dessus plutôt que de
      // laisser withAuth rediriger systématiquement (ce qui casserait les
      // appels fetch() vers /api/admin/** en leur renvoyant une page HTML
      // au lieu d'un 401 JSON).
      authorized: () => true,
    },
  }
)

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] }
