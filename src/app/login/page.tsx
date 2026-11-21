'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Redirection post-connexion limitée aux pages de l'admin : évite qu'un lien
// /login?callbackUrl=https://site-malveillant.com serve de redirection ouverte.
function safeCallbackUrl() {
  const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl') ?? '';
  return /^\/admin(\/[\w\-/]*)?$/.test(callbackUrl) ? callbackUrl : '/admin';
}

export default function LoginPage() {
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Ouvre la session avec le code, puis redirige.
  const completeSignIn = async (id: string, otp: string, rememberDevice: boolean) => {
    const res = await signIn('credentials', { challengeId: id, code: otp, redirect: false });

    if (res?.error) {
      return false;
    }

    if (rememberDevice) {
      // Non bloquant : si ça échoue, l'utilisateur est connecté, il aura juste un code la prochaine fois.
      await fetch('/api/auth/login/trust-device', { method: 'POST' }).catch(() => null);
    }

    router.push(safeCallbackUrl());
    router.refresh();
    return true;
  };

  // Étape 1 : mot de passe vérifié côté serveur, qui envoie le code par mail
  // (sauf appareil de confiance : le serveur renvoie alors le code directement).
  // Renvoie true si la connexion a été finalisée sans passer par l'étape 2.
  const requestCode = async () => {
    const res = await fetch('/api/auth/login/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string; challengeId?: string; code?: string; trusted?: boolean }
      | null;

    if (!res.ok || !data?.challengeId) {
      throw new Error(data?.error || 'Une erreur est survenue.');
    }

    if (data.trusted && data.code) {
      if (await completeSignIn(data.challengeId, data.code, false)) {
        return true;
      }
      throw new Error('Une erreur est survenue.');
    }

    setChallengeId(data.challengeId);
    setCode('');
    setStep('code');
    return false;
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      await requestCode();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2 : le code ouvre la session NextAuth.
  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!(await completeSignIn(challengeId, code, trustDevice))) {
        setError('Code incorrect ou expiré.');
      }
    } catch {
      setError('Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      await requestCode();
      setInfo('Un nouveau code vous a été envoyé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm gap-4">
        {step === 'credentials' ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Connexion Admin</CardTitle>
              <CardDescription>
                Entrez vos identifiants pour accéder au panneau d&apos;administration.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCredentials} className="grid gap-4">
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
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Link href="/mot-de-passe-oublie" className="text-xs text-slate-600 underline">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? 'Vérification...' : 'Continuer'}
                </Button>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Vérification</CardTitle>
              <CardDescription>
                Nous venons d&apos;envoyer un code à 6 chiffres à <strong>{email}</strong>. Il est valable 10 minutes.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCode} className="grid gap-4">
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code de vérification</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    className="text-center font-mono text-2xl tracking-[0.5em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                  />
                  <span>
                    Faire confiance à cet appareil pendant 30 jours
                    <span className="block text-xs text-slate-500">
                      À ne cocher que sur votre propre téléphone ou ordinateur.
                    </span>
                  </span>
                </label>
                {info && <p role="status" className="text-sm text-green-700">{info}</p>}
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button className="w-full" type="submit" disabled={isLoading || code.length !== 6}>
                  {isLoading ? 'Vérification...' : 'Se connecter'}
                </Button>
                <div className="flex w-full justify-between">
                  <Button type="button" variant="ghost" size="sm" disabled={isLoading} onClick={resendCode}>
                    Renvoyer le code
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep('credentials');
                      setError('');
                      setInfo('');
                      setPassword('');
                    }}
                  >
                    Retour
                  </Button>
                </div>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
