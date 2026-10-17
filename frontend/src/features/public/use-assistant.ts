"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

export interface AssistantSource {
  title: string;
  text?: string;
  score?: number;
}
export interface AssistantResponse {
  answer: string;
  mode: string;
  notice?: string;
  sources: AssistantSource[];
}
export interface AssistantMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  mode?: string;
}

export function useAssistant(
  endpoint: "/ai/public-chat" | "/ai/admin-chat",
  greeting: string,
) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: 0, role: "assistant", content: greeting },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const sequence = useRef(1);

  async function send(value: string) {
    const message = value.trim();
    if (!message || inFlight.current) return false;
    if (message.length > 2000) {
      setError("Please keep your question under 2,000 characters.");
      return false;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const id = sequence.current++;
    setMessages((previous) => [
      ...previous,
      { id, role: "user", content: message },
    ]);
    try {
      const response = await api<AssistantResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setMessages((previous) => [
        ...previous,
        {
          id: sequence.current++,
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          mode: response.mode,
        },
      ]);
      return true;
    } catch (cause) {
      setMessages((previous) => previous.filter((item) => item.id !== id));
      setError(
        cause instanceof Error
          ? cause.message
          : "Your question could not be sent. Please try again.",
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { messages, busy, error, send };
}
