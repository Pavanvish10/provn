import { useMutation } from "@tanstack/react-query";

import { sendChatMessageFn } from "@/lib/ai-chat.server";

export type ChatMessage = { role: "user" | "model"; text: string };

export function useSendChatMessage() {
  return useMutation({
    mutationFn: (vars: { history: ChatMessage[]; message: string }) =>
      sendChatMessageFn({ data: vars }),
  });
}
