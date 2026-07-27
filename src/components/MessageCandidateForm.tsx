import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { useStartConversation } from "@/lib/messages-client";

/**
 * Shared "message / invite a candidate" form used from both the Job Hiring
 * applicants view and the Recruiter Dashboard candidate search. Starts (or
 * reuses) a real 1:1 conversation via the existing conversations /
 * conversation_participants / messages tables, then sends one message.
 */
export function MessageCandidateForm({
  userId,
  otherUserId,
  defaultText,
  startConversation,
  onDone,
}: {
  userId: string | undefined;
  otherUserId: string | undefined;
  defaultText: string;
  startConversation: ReturnType<typeof useStartConversation>;
  onDone: () => void;
}) {
  const [text, setText] = useState(defaultText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!userId || !otherUserId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const conversationId = await startConversation.mutateAsync(otherUserId);
      const supabase = getSupabaseBrowserClient();
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: text.trim(),
      });
      if (msgError) throw msgError;
      setSent(true);
      setTimeout(onDone, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="flex items-center gap-1.5 py-4 text-sm text-brand">
        <Check className="h-4 w-4" /> Message sent.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[100px]" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={send} disabled={sending || !text.trim()}>
        {sending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-1.5 h-4 w-4" />
        )}
        Send message
      </Button>
    </div>
  );
}
