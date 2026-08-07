"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationsApi, type Notification } from "@/services/notifications";

/** Notifications query for the top-bar menu. */
export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: notificationsApi.getNotifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Mark all notifications as read and refresh the feed (Phase 3.10). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
