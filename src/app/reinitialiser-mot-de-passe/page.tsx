'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-config";
import Link from 'next/link';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    // Lu à l'envoi plutôt que via useSearchParams (qui impose un <Suspense>).
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Une erreur est survenue.');
      }
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm gap-4">
        <CardHeader>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            {isDone
              ? 'Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.'
              : `Choisissez un mot de passe d’au moins ${MIN_PASSWORD_LENGTH} caractères.`}
          </CardDescription>
        </CardHeader>
        {isDone ? (
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Se connecter</Link>
            </Button>
          </CardFooter>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
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
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
