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
import { registerSchema, type RegisterFormValues } from "../auth-schemas";

export function RegisterForm() {
  const router = useRouter();
  const { register: registerAccount } = useSession();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", companyName: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    try {
      await registerAccount(values.name, values.email, values.password, values.companyName);
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to create your account.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start building with ForgeAI Studio.</p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" placeholder="Ada Lovelace" {...register("name")} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

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
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            autoComplete="organization"
            placeholder="Acme Inc."
            {...register("companyName")}
          />
          {errors.companyName ? (
            <p className="text-xs text-destructive">{errors.companyName.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm password</Label>
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
          {isSubmitting ? "Creating account" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
