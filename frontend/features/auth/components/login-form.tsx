"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/providers/session-provider";
import { ApiError } from "@/services/http-client";
import { loginSchema, type LoginFormValues } from "../auth-schemas";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { login } = useSession();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      const destination = next && next.startsWith("/") ? next : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to sign in. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to ForgeAI Studio</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to continue.</p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to ForgeAI Studio?{" "}
        <Link href="/auth/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
