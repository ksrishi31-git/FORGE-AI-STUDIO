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
import { authApi, type AuthUser } from "@/services/auth";
import { ApiError } from "@/services/http-client";
import { profileSchema, type ProfileFormValues } from "../auth-schemas";

export function ProfileForm({ user }: { user: AuthUser }) {
  const { refreshUser } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      companyName: user.company_name ?? "",
      avatar: user.avatar ?? "",
    },
  });

  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const onSubmit = async (values: ProfileFormValues) => {
    setError(null);
    setSaved(false);
    try {
      await authApi.updateProfile({
        name: values.name,
        company_name: values.companyName?.trim() || null,
        avatar: values.avatar || null,
      });
      await refreshUser();
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to update your profile.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <Alert variant="destructive">{error}</Alert>}
      {saved && <Alert variant="success">Profile updated.</Alert>}

      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input id="profile-name" autoComplete="name" {...register("name")} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-company">Company name</Label>
        <Input
          id="profile-company"
          autoComplete="organization"
          placeholder="Acme Inc."
          {...register("companyName")}
        />
        {errors.companyName ? (
          <p className="text-xs text-destructive">{errors.companyName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-avatar">Avatar URL</Label>
        <Input
          id="profile-avatar"
          type="url"
          placeholder="https://example.com/avatar.png"
          {...register("avatar")}
        />
        {errors.avatar ? <p className="text-xs text-destructive">{errors.avatar.message}</p> : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}
