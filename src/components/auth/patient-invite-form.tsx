"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { registerPatientAction, redeemInviteAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface PatientInviteFormProps {
  token: string;
  email: string;
  hasExistingAccount: boolean;
}

export function PatientInviteForm({
  token,
  email,
  hasExistingAccount,
}: PatientInviteFormProps) {
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);

    startTransition(async () => {
      const result = await registerPatientAction({
        name,
        email,
        password,
        inviteToken: token,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Auto sign-in after registration
      setIsLoggingIn(true);
      await signIn("credentials", { email, password, redirect: false });
      const session = await getSession();
      if (session?.user) {
        router.push("/portal");
        router.refresh();
      } else {
        setSuccess("Account created. Please sign in.");
        setIsLoggingIn(false);
      }
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setIsLoggingIn(true);

    try {
      await signIn("credentials", { email, password, redirect: false });
      const session = await getSession();
      if (!session?.user) {
        setError("Invalid password");
        setIsLoggingIn(false);
        return;
      }

      // Redeem the invite
      await redeemInviteAction(token);

      router.push("/portal");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setIsLoggingIn(false);
    }
  }

  const loading = isPending || isLoggingIn;

  if (hasExistingAccount) {
    return (
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          You already have an account. Sign in to view your note.
        </p>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} disabled />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In & View Note
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
      {success && (
        <Alert>
          <p className="text-sm text-green-600">{success}</p>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Create an account to view your clinical note.
      </p>
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input
          type="password"
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          minLength={8}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account & View Note
      </Button>
    </form>
  );
}
