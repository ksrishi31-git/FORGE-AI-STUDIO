"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/services/auth";
import { ApiError } from "@/services/http-client";
import { resetPasswordSchema, type ResetPasswordFormValues } from "../auth-schemas";

export function ResetPasswordForm({ token }: { token: string | undefined }) {
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setError(null);
    try {
      await authApi.resetPassword({ token: token ?? "", new_password: values.password });
      setReset(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to reset your password.");
    }
  };

  if (!token) {
    return (
      <Alert variant="destructive">This reset link is invalid. Please request a new one.</Alert>
    );
  }

  if (reset) {
    return (
      <div className="space-y-4">
        <Alert variant="success">Your password has been reset. You can now sign in.</Alert>
        <Link href="/auth/login" className="block">
          <Button className="w-full">Go to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? "Resetting password" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
