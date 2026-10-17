"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  CircleDollarSign,
  Clock3,
  Wallet,
  Download,
  FileText,
  LoaderCircle,
  Plus,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { api } from "@/lib/api";
import { date, money, rows, text, type Row } from "@/lib/utils";
import {
  Badge,
  DataTable,
  Dialog,
  Empty,
  ErrorState,
  FormDialog,
  Loading,
} from "@/components/ui/primitives";
import { PageHeading, usePortal } from "./portal-app";
import { SummaryTile } from "./phase-components";
import { type DashboardData } from "./dashboard";
import "./phase-b.css";
import { useToast } from "@/components/providers";
export function Finance({ page }: { page: string }) {
  const { role, base } = usePortal();
  const student = role === "student";
  const owner = role === "owner";
  const client = useQueryClient();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [upload, setUpload] = useState<Row | null>(null);
  const [verification, setVerification] = useState<Row | null>(null);
  const invoices = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api("/invoices?page_size=100"),
  });
  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: () => api("/payments?page_size=100"),
  });
  const residents = useQuery({
    queryKey: ["students"],
    queryFn: () => api("/students?page_size=100"),
    enabled: owner,
  });
  const overview = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  const pendingSummary = useQuery({
    queryKey: ["payments", "pending-count"],
    queryFn: () =>
      api<{ total: number }>("/payments?status=pending&page_size=1"),
  });
  const receiptIntent = useSyncExternalStore(
    subscribeReceiptLocation,
    () => new URLSearchParams(window.location.search).get("receipt") === "1",
    () => false,
  );
  const [shortcutDismissed, setShortcutDismissed] = useState(false);
  const inv = rows(invoices.data).filter(
    (i) => !student || !["draft", "voided"].includes(text(i.status)),
  );
  const pay = rows(payments.data);
  const unpaid = inv.filter((r) => Number(r.balance) > 0);
  const shortcutReady =
    receiptIntent && !shortcutDismissed && !!invoices.data && !!payments.data;
  const shortcutPayment = shortcutReady
    ? pay.find((p) => p.status === "pending")
    : undefined;
  const uploadPayment = upload || shortcutPayment;
  const showRecording =
    recording || (shortcutReady && !shortcutPayment && unpaid.length > 0);
  const paid = pay
    .filter((r) => r.status === "verified")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const outstanding = inv.reduce((sum, r) => sum + Number(r.balance || 0), 0);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["invoices"] }),
      client.invalidateQueries({ queryKey: ["payments"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
      client.invalidateQueries({ queryKey: ["rooms"] }),
      client.invalidateQueries({ queryKey: ["owner-payment-queue"] }),
    ]);
  };
  const createInvoice = async (v: Record<string, string>) => {
    await api("/invoices", {
      method: "POST",
      body: JSON.stringify({
        ...v,
        subtotal: Number(v.subtotal),
        late_fee: Number(v.late_fee || 0),
      }),
    });
    await refresh();
    toast("Invoice generated with an immutable line item breakdown.");
  };
  const verify = async (v: Record<string, string>) => {
    await api(`/payments/${verification?.id}/verification`, {
      method: "POST",
      body: JSON.stringify(v),
    });
    await refresh();
    toast(
      "Payment verified against reconciliation evidence. The invoice balance is updated.",
    );
  };
  const isPayments = page === "payments";
  const heading = student
    ? "My payments"
    : page === "invoices"
      ? "Rent & invoices"
      : page === "outstanding"
        ? "Outstanding dues"
        : "Payments";
  return (
    <div className="finance-workspace">
      <PageHeading
        eyebrow="CLEAR RECORDS. COMPLETE CONFIDENCE."
        title={heading}
        description={
          student
            ? "Your rent, invoices, and payment history. All in one place."
            : page === "outstanding"
              ? "A clear view of every balance that needs attention."
              : "Financial operations with a clear, verifiable trail."
        }
      >
        {owner && (
          <button className="btn btn-outline" onClick={() => setCreating(true)}>
            <Plus size={16} /> Generate invoice
          </button>
        )}
        {isPayments && (
          <button
            className="btn btn-primary"
            disabled={!unpaid.length}
            onClick={() => setRecording(true)}
          >
            <Plus size={16} /> New payment
          </button>
        )}
      </PageHeading>
      {!student && (
        <nav className="subnav-tabs" aria-label="Finance navigation">
          {[
            ["payments", "Payments"],
            ["invoices", "Rent & invoices"],
            ["outstanding", "Outstanding dues"],
          ].map(([id, label]) => (
            <Link
              key={id}
              className={page === id ? "active" : ""}
              href={`${base}/${id}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <div className="finance-metric-grid">
        <SummaryTile
          label="Verified collections"
          value={
            overview.data ? money(overview.data.metrics.collected) : money(paid)
          }
          detail="Verified payments · all time"
          icon={CircleDollarSign}
          tone="green"
        />
        <SummaryTile
          label="Outstanding balance"
          value={
            overview.data
              ? money(overview.data.metrics.outstanding)
              : money(outstanding)
          }
          detail="Across issued invoices"
          icon={Wallet}
          tone="amber"
        />
        <SummaryTile
          label="Awaiting verification"
          value={
            pendingSummary.data
              ? String(pendingSummary.data.total)
              : String(pay.filter((r) => r.status === "pending").length)
          }
          detail="Pending payment submissions"
          icon={Clock3}
          tone="purple"
        />
      </div>
      <div className="inline-notice">
        <ShieldCheck size={17} /> A receipt is supporting information. Payments
        remain pending until authorized staff reconcile them against trusted
        bank or provider records.
      </div>
      {invoices.isPending || payments.isPending ? (
        <Loading />
      ) : invoices.error || payments.error ? (
        <ErrorState
          error={invoices.error || payments.error}
          retry={() => {
            invoices.refetch();
            payments.refetch();
          }}
        />
      ) : (
        <>
          {student && (
            <section className="section-separator">
              <h2 className="section-title">Your invoices</h2>
              <div className="module-grid">
                {inv.length ? (
                  inv.map((i) => (
                    <article
                      key={text(i.id)}
                      className="surface module-card finance-invoice-card"
                    >
                      <div className="room-card-top">
                        <span>
                          <FileText size={23} />
                        </span>
                        <Badge value={i.status} />
                      </div>
                      <h3 className="invoice-number">{text(i.number)}</h3>
                      <p>
                        {text(i.month)} · Due {date(i.due_date)}
                      </p>
                      <div className="overview-stat">
                        <span>Invoice total</span>
                        <strong>{money(i.total as number)}</strong>
                      </div>
                      <div className="overview-stat">
                        <span>Verified paid</span>
                        <strong>{money(i.paid_amount as number)}</strong>
                      </div>
                      <div className="overview-stat">
                        <span>Balance due</span>
                        <strong>{money(i.balance as number)}</strong>
                      </div>
                      <div className="dialog-actions">
                        <a
                          className="btn btn-outline btn-sm"
                          href={`/api/v1/invoices/${i.id}/challan`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download size={14} /> Download challan
                        </a>
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty
                    title="No invoices yet"
                    description="Your monthly invoices will appear here."
                  />
                )}
              </div>
            </section>
          )}
          {isPayments ? (
            <section className={student ? "section-separator" : ""}>
              {student && <h2 className="section-title">Payment history</h2>}
              <DataTable
                data={pay}
                filterKey="status"
                searchPlaceholder="Search payment, invoice, resident…"
                columns={[
                  {
                    key: "reference",
                    label: "Payment reference",
                    render: (r) => (
                      <>
                        <strong className="invoice-number">
                          {text(r.reference)}
                        </strong>
                        <small>{date(r.created_at)}</small>
                      </>
                    ),
                  },
                  ...(!student
                    ? [
                        {
                          key: "student_name",
                          label: "Resident",
                          render: (r: Row) => (
                            <strong>{text(r.student_name)}</strong>
                          ),
                        },
                      ]
                    : []),
                  { key: "invoice_number", label: "Invoice" },
                  {
                    key: "amount",
                    label: "Amount",
                    render: (r) => <strong>{money(r.amount as number)}</strong>,
                  },
                  {
                    key: "method",
                    label: "Method",
                    render: (r) => text(r.method).replaceAll("_", " "),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) => <Badge value={r.status} />,
                  },
                ]}
                actions={(r) => (
                  <>
                    {r.status === "pending" && (
                      <button
                        className="inline-action"
                        onClick={() => setUpload(r)}
                        aria-label="Upload receipt"
                      >
                        <UploadCloud size={14} /> Receipt
                      </button>
                    )}
                    {Number(r.receipt_count) > 0 && (
                      <a
                        className="icon-btn"
                        aria-label="Download receipt"
                        href={`/api/v1/payments/${r.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    {owner && r.status === "pending" && (
                      <button
                        className="inline-action"
                        aria-label="Verify payment"
                        onClick={() => setVerification(r)}
                      >
                        <CheckCheck size={14} /> Verify
                      </button>
                    )}
                  </>
                )}
                emptyTitle="No payment activity yet"
                emptyDescription="Record a payment against an open invoice to get started."
              />
            </section>
          ) : (
            <DataTable
              data={page === "outstanding" ? unpaid : inv}
              filterKey="status"
              searchPlaceholder="Search invoice, student, month…"
              columns={[
                {
                  key: "number",
                  label: "Invoice",
                  render: (r) => (
                    <>
                      <strong className="invoice-number">
                        {text(r.number)}
                      </strong>
                      <small>{text(r.month)}</small>
                    </>
                  ),
                },
                {
                  key: "student_name",
                  label: "Resident",
                  render: (r) => <strong>{text(r.student_name)}</strong>,
                },
                {
                  key: "total",
                  label: "Total",
                  render: (r) => money(r.total as number),
                },
                {
                  key: "paid_amount",
                  label: "Verified paid",
                  render: (r) => money(r.paid_amount as number),
                },
                {
                  key: "balance",
                  label: "Balance",
                  render: (r) => <strong>{money(r.balance as number)}</strong>,
                },
                {
                  key: "due_date",
                  label: "Due date",
                  render: (r) => date(r.due_date),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <Badge value={r.status} />,
                },
              ]}
              actions={(r) => (
                <a
                  className="inline-action"
                  aria-label="Download challan"
                  href={`/api/v1/invoices/${r.id}/challan`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={14} /> Challan
                </a>
              )}
              emptyTitle={
                page === "outstanding"
                  ? "Every account is up to date"
                  : "No invoices yet"
              }
              emptyDescription={
                page === "outstanding"
                  ? "There are no outstanding balances."
                  : "Generate an invoice for an allocated resident."
              }
            />
          )}
        </>
      )}
      {creating && (
        <FormDialog
          title="Generate a rent invoice"
          description="Amounts are in whole Pakistani rupees. Existing monthly invoices cannot be duplicated."
          fields={[
            {
              name: "student_id",
              label: "Student",
              type: "select",
              required: true,
              options: rows(residents.data).map((r) => ({
                value: text(r.id),
                label: text(r.full_name),
              })),
            },
            {
              name: "month",
              label: "Billing month",
              type: "month",
              required: true,
            },
            {
              name: "subtotal",
              label: "Rent amount (PKR)",
              type: "number",
              required: true,
              min: 1,
            },
            {
              name: "late_fee",
              label: "Late fee (PKR)",
              type: "number",
              min: 0,
            },
            {
              name: "due_date",
              label: "Due date",
              type: "date",
              required: true,
            },
          ]}
          defaults={{
            month: new Date().toISOString().slice(0, 7),
            late_fee: "0",
          }}
          submitLabel="Generate invoice"
          onSubmit={createInvoice}
          onClose={() => setCreating(false)}
        />
      )}{" "}
      {showRecording && (
        <RecordPayment
          invoices={unpaid}
          onClose={() => {
            setRecording(false);
            setShortcutDismissed(true);
          }}
          onSaved={async (payment) => {
            await refresh();
            toast(
              "Payment recorded for review. Upload your receipt as supporting evidence.",
            );
            setUpload(payment);
          }}
        />
      )}
      {uploadPayment && (
        <ReceiptUpload
          payment={uploadPayment}
          onClose={() => {
            setUpload(null);
            setShortcutDismissed(true);
          }}
          onSaved={async () => {
            await refresh();
            toast(
              "Receipt securely uploaded. The payment remains pending reconciliation.",
            );
          }}
        />
      )}
      {verification && (
        <FormDialog
          title="Verify payment"
          description={`${text(verification.reference)} · ${money(verification.amount as number)}. Confirm only after matching trusted settlement evidence.`}
          fields={[
            {
              name: "evidence_type",
              label: "Evidence type",
              type: "select",
              required: true,
              options: [
                { value: "bank_statement", label: "Reconciled bank statement" },
                {
                  value: "provider_settlement",
                  label: "Payment provider settlement",
                },
              ],
            },
            {
              name: "evidence_reference",
              label: "Evidence reference",
              required: true,
              placeholder: "Statement date / settlement batch reference",
            },
            {
              name: "bank_reference",
              label: "Bank transaction reference",
              required: true,
              placeholder: "Unique settled transaction reference",
            },
            { name: "notes", label: "Reconciliation notes", type: "textarea" },
            {
              name: "confirmation",
              label: "Confirmation",
              required: true,
              placeholder: "Type VERIFY PAYMENT",
              description:
                "Enter VERIFY PAYMENT exactly to confirm this financial operation.",
            },
          ]}
          defaults={{
            evidence_type: "bank_statement",
            bank_reference: text(verification.bank_reference, ""),
          }}
          submitLabel="Verify payment"
          onSubmit={verify}
          onClose={() => setVerification(null)}
        />
      )}
    </div>
  );
}
function subscribeReceiptLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
function RecordPayment({
  invoices,
  onClose,
  onSaved,
}: {
  invoices: Row[];
  onClose: () => void;
  onSaved: (row: Row) => Promise<void>;
}) {
  const [key] = useState(() => crypto.randomUUID());
  return (
    <FormDialog
      title="Record a payment"
      description="This creates a pending payment for review. Your balance changes after reconciliation."
      fields={[
        {
          name: "invoice_id",
          label: "Invoice",
          type: "select",
          required: true,
          options: invoices.map((i) => ({
            value: text(i.id),
            label: `${text(i.number)} · ${text(i.student_name, "Your invoice")} · Due ${money(i.balance as number)}`,
          })),
        },
        {
          name: "amount",
          label: "Amount (PKR)",
          type: "number",
          required: true,
          min: 1,
        },
        {
          name: "method",
          label: "Method",
          type: "select",
          required: true,
          options: [
            { value: "bank_transfer", label: "Bank transfer" },
            { value: "cash", label: "Cash deposit" },
            { value: "easypaisa", label: "Easypaisa" },
            { value: "jazzcash", label: "JazzCash" },
          ],
        },
        {
          name: "bank_reference",
          label: "Transaction reference",
          placeholder: "Transfer / deposit reference if available",
        },
      ]}
      defaults={{
        invoice_id: text(invoices[0]?.id, ""),
        method: "bank_transfer",
      }}
      submitLabel="Record payment"
      onSubmit={async (v) => {
        const result = await api<Row>("/payments", {
          method: "POST",
          body: JSON.stringify({
            ...v,
            amount: Number(v.amount),
            bank_reference: v.bank_reference || null,
            idempotency_key: key,
          }),
        });
        await onSaved(result);
      }}
      onClose={onClose}
    />
  );
}
function ReceiptUpload({
  payment,
  onClose,
  onSaved,
}: {
  payment: Row;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("The file must be smaller than 5 MB.");
      return;
    }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      setError("Choose a PDF, JPEG, or PNG file.");
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/payments/${payment.id}/receipts`, {
        method: "POST",
        body: form,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to upload the document.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      title="Upload receipt"
      description={`Payment ${text(payment.reference)} · ${money(payment.amount as number)}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="dialog-form">
        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}
        <label
          className={`receipt-upload premium-receipt-upload ${file ? "receipt-selected" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFile(e.dataTransfer.files[0] || null);
          }}
        >
          <UploadCloud size={30} />
          <strong>{file ? file.name : "Drag & drop your receipt here"}</strong>
          <span>or choose a file below</span>
          <p>PDF, PNG, or JPEG · Maximum 5 MB</p>
          <input
            aria-label="Receipt document"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="inline-notice">
          <ShieldCheck size={16} /> Documents are stored privately and can be
          accessed only by authorized accounts.
        </div>
        <div className="dialog-actions">
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={!file || pending}
            type="submit"
            className="btn btn-primary"
          >
            {pending && <LoaderCircle size={16} className="spin" />} Upload
            receipt
          </button>
        </div>
      </form>
    </Dialog>
  );
}
