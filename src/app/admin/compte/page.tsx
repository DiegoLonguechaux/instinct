'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth-config';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

export default function AccountPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmation) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Erreur lors du changement de mot de passe.');
      }

      // Toutes les sessions du compte sont révoquées côté serveur : on repart de la page de connexion.
      setIsDone(true);
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Mon compte</h1>

      {session?.user && (
        <p className="mb-8 text-sm text-muted-foreground">
          Connecté en tant que <strong>{session.user.name}</strong> ({session.user.email})
        </p>
      )}

      <section className="max-w-md">
        <h2 className="mb-1 text-lg font-semibold">Changer mon mot de passe</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Après le changement, vous serez déconnecté de tous vos appareils et devrez vous reconnecter.
        </p>

        {isDone ? (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-400">
            Mot de passe modifié. Redirection vers la page de connexion...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Au moins {MIN_PASSWORD_LENGTH} caractères.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Changer le mot de passe'}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
