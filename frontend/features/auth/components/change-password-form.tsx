"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/providers/session-provider";
import { authApi } from "@/services/auth";
import { ApiError } from "@/services/http-client";
import { changePasswordSchema, type ChangePasswordFormValues } from "../auth-schemas";

const EMPTY: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordForm() {
  const { logout } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => setSaved(false), 5000);
    return () => clearTimeout(timer);
  }, [saved]);

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setError(null);
    setSaved(false);
    try {
      await authApi.changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      reset(EMPTY);
      setSaved(true);
      // Rotating the password revokes all sessions server-side.
      await logout();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to change your password.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <Alert variant="destructive">{error}</Alert>}
      {saved && (
        <Alert variant="success">
          Password changed. You have been signed out of all sessions — sign in with your new
          password.
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        {errors.newPassword ? (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <Input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Change password
      </Button>
    </form>
  );
}
