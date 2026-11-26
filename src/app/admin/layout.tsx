import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { AdminDarkMode } from "@/components/admin/admin-dark-mode"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Administration | INSTINCT", robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Le middleware ne fait que décoder le JWT (il ne peut pas interroger la
  // base) : cette vérification serveur écarte aussi les sessions révoquées
  // (compte supprimé, mot de passe changé).
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <AdminDarkMode />
      <AppSidebar />
      <main className="admin-main w-full min-w-0 bg-background text-foreground">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
