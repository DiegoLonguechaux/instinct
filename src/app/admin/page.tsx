'use client';

import { useSession } from "next-auth/react";

export default function AdminDashboard() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col p-8 bg-muted h-full">
      <h1 className="text-3xl font-bold mb-8">Tableau de bord</h1>
      <p className="mb-4 text-lg text-muted-foreground">Bienvenue, <span className="font-bold text-foreground">{session?.user?.name}</span> !</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards to match structure */}
        <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-2">Gérer les utilisateurs</h3>
          <p className="text-muted-foreground text-sm">Gérer les accès et les rôles des membres.</p>
        </div>
      </div>
    </div>
  );
}
