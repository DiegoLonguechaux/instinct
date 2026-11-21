"use client"

import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CalendarDays, Disc3, FileText, Image as ImageIcon, KeyRound, LayoutDashboard, LogOut, Package, ShoppingBag, Users } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState("")
  const [ordersToPrepare, setOrdersToPrepare] = useState(0)

  // Pastille « commandes à préparer » (payées, pas encore traitées).
  useEffect(() => {
    fetch("/api/admin/orders?summary=1")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { toPrepare?: number } | null) => setOrdersToPrepare(data?.toPrepare ?? 0))
      .catch(() => setOrdersToPrepare(0))
  }, [])

  useEffect(() => {
    const loadGroupLogo = async () => {
      try {
        const response = await fetch("/api/admin/general-info")

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { logoUrl?: string }
        setLogoUrl(data.logoUrl ?? "")
      } catch {
        setLogoUrl("")
      }
    }

    loadGroupLogo()
  }, [])

  const isSuperAdmin = session?.user?.role === "super-admin"

  // Page courante en violet ; /admin ne correspond qu'à lui-même.
  const navClass = (href: string) => {
    const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/")
    return active ? "text-instinct-purple hover:text-instinct-purple font-medium" : undefined
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        {logoUrl ? (
          <div className="w-full">
            <Image
              src={logoUrl}
              alt="Logo du groupe"
              width={400}
              height={120}
              className="w-full h-auto max-h-24 object-contain"
            />
          </div>
        ) : (
          <h2 className="text-xl font-bold tracking-tight">Admin Dashboard</h2>
        )}
        {session?.user && (
          <div className="flex flex-col text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{session.user.name}</span>
            <span>{session.user.email}</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin")}>
                  <Link href="/admin">
                    <LayoutDashboard />
                    <span>Tableau de bord</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/informations-generales")}>
                  <Link href="/admin/informations-generales">
                    <FileText />
                    <span>Informations générales</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/concerts")}>
                  <Link href="/admin/concerts">
                    <CalendarDays />
                    <span>Concerts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/sorties")}>
                  <Link href="/admin/sorties">
                    <Disc3 />
                    <span>Sorties</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/galerie")}>
                  <Link href="/admin/galerie">
                    <ImageIcon />
                    <span>Galerie</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/merch")}>
                  <Link href="/admin/merch">
                    <ShoppingBag />
                    <span>Merch</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/commandes")}>
                  <Link href="/admin/commandes">
                    <Package />
                    <span>Commandes</span>
                    {ordersToPrepare > 0 && (
                      <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {ordersToPrepare}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/merch/caisse")}>
                  <Link href="/admin/merch/caisse">
                    <ShoppingCart />
                    <span>Caisse merch</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              {/* <SidebarMenuItem>
                <SidebarMenuButton asChild className={navClass("/admin/merch/statistiques")}>
                  <Link href="/admin/merch/statistiques">
                    <ChartColumn />
                    <span>Stats merch</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}

              {isSuperAdmin && (
                <>
                  <div className="px-2 py-1">
                    <Separator />
                  </div>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={navClass("/admin/users")}>
                      <Link href="/admin/users">
                        <Users />
                        <span>Utilisateurs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={navClass("/admin/compte")}>
              <Link href="/admin/compte">
                <KeyRound />
                <span>Mon compte</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut />
              <span>Se déconnecter</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
