"use client";

import { Bell, Cpu, Moon, Palette, Server, Sun, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePlatformHealth } from "@/features/deployment/hooks/use-health";
import { useSession } from "@/providers/session-provider";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const EMAIL_PREFS_KEY = "forgeai-email-notifications";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useSession();
  const health = usePlatformHealth();

  const [emailPrefs, setEmailPrefs] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMAIL_PREFS_KEY);
      if (stored !== null) {
        setEmailPrefs(stored === "true");
      }
    } catch {
      // Storage unavailable — use defaults.
    }
  }, []);

  const updateEmailPrefs = (value: boolean) => {
    setEmailPrefs(value);
    try {
      localStorage.setItem(EMAIL_PREFS_KEY, String(value));
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage appearance, notifications, and platform information.
        </p>
      </header>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <Palette className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
            Appearance
          </CardTitle>
          <CardDescription>Choose how ForgeAI Studio looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Theme">
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => {
                  if (theme !== option) {
                    toggleTheme();
                  }
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  theme === option
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted",
                )}
              >
                {option === "light" ? (
                  <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Moon className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="text-sm font-medium capitalize">{option}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <Bell className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
            Notifications
          </CardTitle>
          <CardDescription>Pipeline events appear in the top bar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive a summary when agent runs complete, fail, or are cancelled.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailPrefs}
              aria-label="Toggle email notifications"
              onClick={() => updateEmailPrefs(!emailPrefs)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                emailPrefs ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-background shadow transition-transform",
                  emailPrefs ? "translate-x-6" : "translate-x-1",
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <User className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
            Account
          </CardTitle>
          <CardDescription>Profile details and credentials.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name ?? "Account"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email ?? ""}
              {user?.company_name ? ` · ${user.company_name}` : ""}
            </p>
          </div>
          <Link href="/profile">
            <Button variant="outline" size="sm">
              Edit profile
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Platform */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <Server className="mr-2 inline size-4 text-muted-foreground" aria-hidden="true" />
            Platform
          </CardTitle>
          <CardDescription>Current deployment status of the platform services.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">API service</span>
              <Badge
                variant={
                  health.status === "ok"
                    ? "success"
                    : health.status === "partial"
                      ? "warning"
                      : "destructive"
                }
              >
                {health.status}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Version</span>
              <span className="font-mono text-sm">{health.version}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">Execution engine</span>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Cpu className="size-3.5 text-muted-foreground" aria-hidden="true" />
                LangGraph · 10 agents
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
