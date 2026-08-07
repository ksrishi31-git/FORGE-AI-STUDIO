"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { useSession } from "@/providers/session-provider";
import type { AuthUser } from "@/services/auth";

const ROLE_VARIANT: Record<AuthUser["role"], "default" | "info" | "muted"> = {
  admin: "default",
  developer: "info",
};

export default function ProfilePage() {
  const { user, status, loggingOut, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    // A logout is already navigating to the public landing page.
    if (status === "unauthenticated" && !loggingOut) {
      router.replace("/auth/login");
    }
  }, [status, loggingOut, router]);

  if (status === "loading" || user === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await logout();
    // replace(): don't leave the stale authenticated page in history.
    router.replace("/");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.company_name ? (
              <p className="text-sm font-medium text-muted-foreground">{user.company_name}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ROLE_VARIANT[user.role]}>{user.role}</Badge>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and avatar.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Rotate your password. All sessions are signed out.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
