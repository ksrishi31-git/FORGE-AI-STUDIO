/**
 * Notifications API service (BAD §5). The top-bar menu polls this feed;
 * pipeline terminal events are persisted by the backend (Phase 3.10).
 */
import { z } from "zod";

import { http } from "./http-client";

export const notificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  run_id: z.string().uuid().nullable(),
  created_at: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

const notificationsPageSchema = z.object({
  items: z.array(notificationSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const notificationsApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const page = await http.get("/api/v1/notifications?page_size=10", notificationsPageSchema);
    return page.items;
  },

  /** Mark every notification as read (Phase 3.10). */
  markAllRead: () => http.post("/api/v1/notifications/read-all", undefined, z.void()),
};
