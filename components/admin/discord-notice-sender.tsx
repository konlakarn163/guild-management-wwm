"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";

export function DiscordNoticeSender() {
  const [noticeMessage, setNoticeMessage] = useState<string>("");
  const [mentionRole, setMentionRole] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSendNotice = async () => {
    if (!noticeMessage.trim()) {
      const errorMessage = "Please enter a message";
      toast.error(errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        const errorMessage = "Please login first";
        toast.error(errorMessage);
        return;
      }

      await apiFetch("/api/guild-war/notices/send", {
        method: "POST",
        token,
        body: JSON.stringify({ message: noticeMessage, mentionRole }),
      });

      const successMessage = "Message sent to Discord";
      toast.success(successMessage);
      setNoticeMessage("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionCard title="Send Discord Notice">
      <div className="flex flex-col gap-3">
        <textarea
          value={noticeMessage}
          onChange={(e) => setNoticeMessage(e.target.value)}
          placeholder="Enter message to send to Discord..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
          rows={4}
          disabled={isSubmitting}
        />
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mentionRole}
              onChange={(e) => setMentionRole(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              disabled={isSubmitting}
            />
            <span className="text-sm text-slate-300">Mention everyone (@role)</span>
          </label>
          <Button
            type="button"
            onClick={() => void onSendNotice()}
            className="rounded-xl"
            disabled={isSubmitting || !noticeMessage.trim()}
          >
            {isSubmitting ? "Sending..." : "Send To Discord"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
