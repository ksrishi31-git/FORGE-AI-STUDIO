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
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../auth-schemas";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; resetUrl: string | null } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await authApi.forgotPassword({ email: values.email });
      setSuccess({ message: response.message, resetUrl: response.reset_url });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to request a reset link.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send you a reset link.
        </p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && (
        <Alert variant="success">
          <div className="space-y-1">
            <p>{success.message}</p>
            {success.resetUrl ? (
              <p className="break-all font-mono text-xs opacity-80">{success.resetUrl}</p>
            ) : null}
          </div>
        </Alert>
      )}

      {!success && (
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
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {isSubmitting ? "Sending link" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
