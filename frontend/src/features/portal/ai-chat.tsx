"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  LoaderCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { date } from "@/lib/utils";
import { useToast } from "@/components/providers";
import {
  Badge,
  DataTable,
  Dialog,
  ErrorState,
  FormDialog,
  Loading,
} from "@/components/ui/primitives";
import { PageHeading, usePortal } from "./portal-app";
import { useAssistant } from "@/features/public/use-assistant";

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  approved: boolean;
  created_at: string;
}

export function AIChat() {
  const { role } = usePortal();
  const [tab, setTab] = useState<"assistant" | "knowledge">("assistant");
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [approval, setApproval] = useState<KnowledgeDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const client = useQueryClient();
  const chat = useAssistant(
    "/ai/admin-chat",
    "Welcome to your E-11 assistant. Ask about verified collections, outstanding balances, room inventory, or complaint trends. I use authorized, read-only data and cannot change records or verify payments.",
  );
  const knowledge = useQuery({
    queryKey: ["knowledge"],
    queryFn: () =>
      api<{ items: KnowledgeDocument[]; total: number }>(
        "/ai/knowledge?page_size=100",
      ),
    enabled: role === "owner",
  });
  useEffect(() => {
    if (tab === "assistant") end.current?.scrollIntoView({ block: "nearest" });
  }, [chat.messages, chat.busy, tab]);

  if (role !== "owner")
    return (
      <ErrorState
        error={new Error("The administrative assistant requires owner access.")}
      />
    );

  async function send(message: string) {
    if (await chat.send(message)) setInput("");
  }
  async function toggleApproval() {
    if (!approval) return;
    setSaving(true);
    try {
      await api(`/ai/knowledge/${approval.id}`, {
        method: "PATCH",
        body: JSON.stringify({ approved: !approval.approved }),
      });
      await client.invalidateQueries({ queryKey: ["knowledge"] });
      toast(
        approval.approved
          ? "Document removed from public retrieval."
          : "Document approved for public retrieval.",
      );
      setApproval(null);
    } catch (cause) {
      toast(
        cause instanceof Error
          ? cause.message
          : "Approval could not be changed.",
        true,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="YOUR HOSTEL, INTELLIGENTLY CONNECTED"
        title="A little clarity. A lot less searching."
        description="Source-backed operational answers and an approved public knowledge base."
      >
        <button
          className={`btn ${tab === "assistant" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setTab("assistant")}
        >
          <Sparkles size={15} /> Assistant
        </button>
        <button
          className={`btn ${tab === "knowledge" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setTab("knowledge")}
        >
          <BookOpen size={15} /> Knowledge base
        </button>
      </PageHeading>
      {tab === "assistant" ? (
        <div className="ai-workspace">
          <section
            className="ai-main surface"
            aria-label="Administrative assistant"
          >
            <div className="ai-status">
              <ShieldCheck size={15} /> Development retrieval · No external
              language model · Read-only answers
            </div>
            <div
              className="ai-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {chat.messages.map((message) => (
                <article
                  key={message.id}
                  className={`ai-message ${message.role === "user" ? "user" : ""}`}
                >
                  <span aria-hidden="true">
                    {message.role === "assistant" ? (
                      <Sparkles size={17} />
                    ) : (
                      <UserRound size={17} />
                    )}
                  </span>
                  <div>
                    {message.content}
                    {!!message.sources?.length && (
                      <small>
                        <BookOpen
                          size={12}
                          style={{ verticalAlign: "middle", marginRight: 5 }}
                        />
                        {message.sources
                          .map((source) => source.title)
                          .join(" · ")}
                      </small>
                    )}
                  </div>
                </article>
              ))}
              {chat.busy && (
                <div className="ai-status" role="status">
                  <LoaderCircle className="spin" size={14} /> Checking
                  authorized records…
                </div>
              )}
              <div ref={end} />
            </div>
            {chat.error && (
              <div
                className="inline-notice"
                role="alert"
                style={{ margin: "0 23px" }}
              >
                {chat.error}
              </div>
            )}
            <form
              className="ai-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <input
                aria-label="Ask your administrative assistant"
                placeholder="Ask about your hostel…"
                maxLength={2000}
                disabled={chat.busy}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                type="submit"
                aria-label="Send question"
                disabled={chat.busy || !input.trim()}
              >
                {chat.busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </section>
          <aside className="ai-sidebar surface">
            <span className="eyebrow blue">START A CONVERSATION</span>
            <h3 style={{ marginTop: 18 }}>A clearer picture, in a question.</h3>
            <p>
              Answers are grounded in actual authorized records. Financial
              totals refer to recorded billing periods.
            </p>
            <div className="ai-suggestions">
              {[
                "How much rent has been collected?",
                "What are our outstanding dues?",
                "Show room inventory and allocations",
                "What are the common complaints?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={chat.busy}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="info-note">
              <Database size={17} />
              <p>
                No external LLM is connected. This deterministic assistant uses
                typed, read-only queries and approved text retrieval. It cannot
                allocate beds, submit transactions, or verify payments.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <>
          <div className="section-row">
            <div>
              <span className="section-kicker">PUBLISHED INFORMATION ONLY</span>
              <h2>Knowledge that helps your residents.</h2>
            </div>
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={15} /> Add knowledge
            </button>
          </div>
          <div className="inline-notice" style={{ marginBottom: 20 }}>
            <ShieldCheck size={18} />
            <span>
              Only approved documents are used by the public assistant. Keep
              private resident information, financial records, credentials, and
              internal instructions out of this knowledge base.
            </span>
          </div>
          {knowledge.isPending ? (
            <Loading />
          ) : knowledge.isError ? (
            <ErrorState
              error={knowledge.error}
              retry={() => knowledge.refetch()}
            />
          ) : (
            <DataTable
              data={knowledge.data.items.map((document) => ({
                ...document,
                status: document.approved ? "published" : "draft",
              }))}
              columns={[
                {
                  key: "title",
                  label: "Document",
                  render: (row) => (
                    <strong>
                      <FileText
                        size={14}
                        style={{
                          verticalAlign: "middle",
                          marginRight: 7,
                          color: "#6f92bf",
                        }}
                      />
                      {String(row.title)}
                    </strong>
                  ),
                },
                {
                  key: "content",
                  label: "Preview",
                  render: (row) => (
                    <span>
                      {String(row.content).slice(0, 100)}
                      {String(row.content).length > 100 ? "…" : ""}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Visibility",
                  render: (row) => <Badge value={row.status} />,
                },
                {
                  key: "created_at",
                  label: "Created",
                  render: (row) => date(row.created_at),
                },
              ]}
              searchPlaceholder="Search knowledge documents…"
              filterKey="status"
              emptyTitle="Your knowledge base starts here."
              emptyDescription="Add approved policies, room information, and answers to frequently asked questions."
              actions={(row) => (
                <button
                  className="inline-action"
                  onClick={() =>
                    setApproval(
                      knowledge.data.items.find((item) => item.id === row.id) ||
                        null,
                    )
                  }
                >
                  {row.approved ? "Unpublish" : "Review & publish"}
                </button>
              )}
            />
          )}
          {knowledge.data && knowledge.data.total > 100 && (
            <p className="info-note">
              Showing the most recent 100 documents of {knowledge.data.total}.
            </p>
          )}
        </>
      )}
      {adding && (
        <FormDialog
          title="Add hostel knowledge"
          description="Plain text is parsed, chunked, and indexed with the development retrieval provider. New documents start as drafts."
          fields={[
            {
              name: "title",
              label: "Document title",
              required: true,
              placeholder: "For example: Approved move-in policy",
            },
            {
              name: "content",
              label: "Public document content",
              type: "textarea",
              required: true,
              placeholder:
                "Enter at least 20 characters of approved public information.",
              description:
                "Do not include private data, secrets, or instructions for the assistant.",
            },
          ]}
          submitLabel="Save draft & index"
          onClose={() => setAdding(false)}
          onSubmit={async (values) => {
            if (values.title.length < 3 || values.title.length > 160)
              throw new Error(
                "Use a document title between 3 and 160 characters.",
              );
            if (values.content.length < 20 || values.content.length > 50000)
              throw new Error(
                "Document content must contain between 20 and 50,000 characters.",
              );
            await api("/ai/knowledge", {
              method: "POST",
              body: JSON.stringify({
                title: values.title,
                content: values.content,
                approved: false,
              }),
            });
            await client.invalidateQueries({ queryKey: ["knowledge"] });
            toast(
              "Knowledge draft saved and indexed. Review it before publishing.",
            );
          }}
        />
      )}
      {approval && (
        <Dialog
          title={
            approval.approved
              ? "Remove this document from public retrieval?"
              : "Approve this document for public retrieval?"
          }
          description={approval.title}
          onClose={() => {
            if (!saving) setApproval(null);
          }}
        >
          <div className="dialog-body">
            <div className="inline-notice">
              <ShieldCheck size={19} />
              <span>
                {approval.approved
                  ? "The public assistant will stop retrieving this document. The document itself is retained."
                  : "Publishing makes this text available to the public assistant. Confirm that it contains only approved public property information."}
              </span>
            </div>
            <div
              style={{
                maxHeight: 290,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontSize: 12,
                lineHeight: 1.9,
                padding: "20px 0",
                color: "#6d7a91",
              }}
            >
              {approval.content}
            </div>
            <div className="dialog-actions">
              <button
                className="btn btn-outline"
                disabled={saving}
                onClick={() => setApproval(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={toggleApproval}
              >
                {saving ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {approval.approved ? "Unpublish document" : "Publish document"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
