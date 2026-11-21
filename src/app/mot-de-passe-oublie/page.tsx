'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Une erreur est survenue.');
      }
      setIsSent(true);
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
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            {isSent
              ? 'Si un compte existe avec cette adresse, un mail contenant un lien de réinitialisation vient de partir. Pensez à vérifier vos spams.'
              : 'Entrez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.'}
          </CardDescription>
        </CardHeader>
        {isSent ? (
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/login">Retour à la connexion</Link>
            </Button>
          </CardFooter>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Envoi...' : 'Envoyer le lien'}
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
