"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useAssistant } from "./use-assistant";

export function PublicAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const chat = useAssistant(
    "/ai/public-chat",
    "Hi, welcome to E-11! I can help you explore published room prices, facilities, and booking information. What would you like to know?",
  );
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "nearest" });
  }, [chat.messages, chat.busy, open]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  async function send(message: string) {
    if (await chat.send(message)) setInput("");
  }

  return (
    <div className="pub-assistant-widget">
      {open && (
        <section
          className="pub-assistant-panel"
          role="dialog"
          aria-label="E-11 public assistant"
        >
          <header>
            <span className="pub-assistant-symbol">
              <Sparkles size={21} />
            </span>
            <div>
              <h2>Your E-11 guide</h2>
              <p>
                <i /> A little help, anytime.
              </p>
            </div>
            <button aria-label="Close assistant" onClick={close}>
              <X size={19} />
            </button>
          </header>
          <div className="pub-assistant-mode">
            <ShieldCheck size={13} />
            <span>Local FAQ & retrieval · No live language model</span>
          </div>
          <div
            className="pub-assistant-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={`pub-assistant-message pub-assistant-message-${message.role}`}
              >
                <span aria-hidden="true">
                  {message.role === "assistant" ? (
                    <Sparkles size={14} />
                  ) : (
                    <UserRound size={14} />
                  )}
                </span>
                <div>
                  <p>{message.content}</p>
                  {!!message.sources?.length && (
                    <details>
                      <summary>
                        <BookOpen size={11} /> Sources ·{" "}
                        {message.sources.length}
                      </summary>
                      <ul>
                        {message.sources.map((source, index) => (
                          <li key={`${source.title}-${index}`}>
                            <strong>{source.title}</strong>
                            {source.text && <p>{source.text}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {chat.busy && (
              <div className="pub-assistant-thinking" role="status">
                <LoaderCircle className="pub-spin" size={14} /> Checking
                published information…
              </div>
            )}
            <div ref={end} />
          </div>
          {chat.messages.length === 1 && (
            <div className="pub-assistant-suggestions">
              {[
                "What are the room prices?",
                "How do I book a seat?",
                "What facilities are available?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={chat.busy}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                  <ArrowRight size={12} />
                </button>
              ))}
            </div>
          )}
          {chat.error && (
            <p className="pub-assistant-error" role="alert">
              {chat.error}
            </p>
          )}
          <form
            className="pub-assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label
              className="pub-visually-hidden"
              htmlFor="public-assistant-question"
            >
              Ask the E-11 assistant
            </label>
            <input
              ref={field}
              id="public-assistant-question"
              placeholder="Ask about your next home…"
              value={input}
              maxLength={2000}
              disabled={chat.busy}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={!input.trim() || chat.busy}
            >
              {chat.busy ? (
                <LoaderCircle className="pub-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
            </button>
          </form>
          <div className="pub-assistant-disclaimer">
            Answers use published information.{" "}
            <Link href="/booking">Submit bookings yourself.</Link>
          </div>
        </section>
      )}
      <button
        ref={trigger}
        className={`pub-assistant-trigger${open ? " pub-assistant-trigger-open" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Close E-11 assistant" : "Open E-11 assistant"}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? (
          <X size={22} />
        ) : (
          <>
            <span>
              <Sparkles size={19} />
            </span>
            <span>
              Ask E-11<small>Your hostel guide</small>
            </span>
            <i />
          </>
        )}
      </button>
    </div>
  );
}
