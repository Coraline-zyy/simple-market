// lib/notify.ts
// After a message is saved, ask the server to email the recipient.
// Fire-and-forget: a failed email must never block or break chatting.
import { supabase } from "@/lib/supabaseClient";

export type MessageKind = "task" | "direct" | "admin";

export function notifyNewMessage(kind: MessageKind, messageId: string | null | undefined) {
  if (!messageId) return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch("/api/message-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, messageId }),
        keepalive: true,
      });
    } catch {
      // ignore: email is a best-effort extra
    }
  })();
}

/** Tell other parts of the page (e.g. the unread badge in the nav) to refresh now. */
export function announceUnreadChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("youqiu:unread-changed"));
}
