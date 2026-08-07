import { z } from "zod";

import { http } from "./http-client";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  company_name: z.string().nullable(),
  role: z.enum(["admin", "developer"]),
  avatar: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type AuthUser = z.infer<typeof userSchema>;

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  user: userSchema,
});

const forgotPasswordSchema = z.object({
  message: z.string(),
  reset_url: z.string().nullable(),
});

export type ForgotPasswordResponse = z.infer<typeof forgotPasswordSchema>;

export const authApi = {
  register: (data: { name: string; email: string; company_name?: string; password: string }) =>
    http.post("/api/v1/auth/register", data, tokenResponseSchema),

  login: (data: { email: string; password: string }) =>
    http.post("/api/v1/auth/login", data, tokenResponseSchema),

  // An empty JSON body is required: the endpoint's RefreshRequest model rejects
  // body-less requests (422), which would skip server-side token revocation.
  logout: () => http.post("/api/v1/auth/logout", {}),

  refresh: () => http.post("/api/v1/auth/refresh", {}, tokenResponseSchema),

  me: () => http.get("/api/v1/auth/me", userSchema),

  updateProfile: (data: { name?: string; company_name?: string | null; avatar?: string | null }) =>
    http.patch("/api/v1/auth/profile", data, userSchema),

  changePassword: (data: { current_password: string; new_password: string }) =>
    http.patch("/api/v1/auth/change-password", data),

  forgotPassword: (data: { email: string }) =>
    http.post("/api/v1/auth/forgot-password", data, forgotPasswordSchema),

  resetPassword: (data: { token: string; new_password: string }) =>
    http.post("/api/v1/auth/reset-password", data),
};
