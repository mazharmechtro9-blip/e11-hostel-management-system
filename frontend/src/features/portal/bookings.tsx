"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Check, Eye, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { date, rows, text, type Row } from "@/lib/utils";
import {
  Badge,
  DataTable,
  Dialog,
  ErrorState,
  FormDialog,
  Loading,
} from "@/components/ui/primitives";
import { PageHeading, usePortal } from "./portal-app";
import { useToast } from "@/components/providers";
export function Bookings() {
  const q = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api("/bookings?page_size=100"),
  });
  const client = useQueryClient();
  const toast = useToast();
  const { base } = usePortal();
  const [decision, setDecision] = useState<{
    row: Row;
    approve: boolean;
  } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const data = rows(q.data);
  const submit = async (v: Record<string, string>) => {
    if (!decision) return;
    await api(
      `/bookings/${decision.row.id}/${decision.approve ? "approve" : "reject"}`,
      { method: "POST", body: JSON.stringify(v) },
    );
    await Promise.all([
      client.invalidateQueries({ queryKey: ["bookings"] }),
      client.invalidateQueries({ queryKey: ["students"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    toast(
      decision.approve
        ? "Booking approved. The resident can now be allocated an available bed."
        : "Booking rejected. The decision has been recorded.",
    );
  };
  return (
    <>
      <PageHeading
        eyebrow="NEW BEGINNINGS"
        title="Booking requests"
        description="Turn a first hello into a place to call home."
      >
        <Link href="/booking" target="_blank" className="btn btn-outline">
          <CalendarCheck2 size={15} /> Open booking form
        </Link>
      </PageHeading>
      <div className="stats-inline">
        <section className="surface">
          <span>Total requests</span>
          <strong>{data.length}</strong>
        </section>
        <section className="surface">
          <span>Awaiting review</span>
          <strong>
            {
              data.filter((r) =>
                ["submitted", "under_review"].includes(text(r.status)),
              ).length
            }
          </strong>
        </section>
        <section className="surface">
          <span>Approved</span>
          <strong>{data.filter((r) => r.status === "approved").length}</strong>
        </section>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <DataTable
          data={data}
          filterKey="status"
          searchPlaceholder="Search applicant, reference, email…"
          columns={[
            {
              key: "reference",
              label: "Reference",
              render: (r) => (
                <strong className="invoice-number">{text(r.reference)}</strong>
              ),
            },
            {
              key: "full_name",
              label: "Applicant",
              render: (r) => (
                <>
                  <strong>{text(r.full_name)}</strong>
                  <small>{text(r.email)}</small>
                </>
              ),
            },
            {
              key: "room_type",
              label: "Room preference",
              render: (r) => text(r.room_type || r.room_type_name),
            },
            {
              key: "created_at",
              label: "Requested",
              render: (r) => date(r.created_at),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge value={r.status} />,
            },
          ]}
          actions={(r) => (
            <>
              <button
                className="icon-btn"
                aria-label="View booking"
                onClick={() => setDetail(r)}
              >
                <Eye size={15} />
              </button>
              {["submitted", "under_review"].includes(text(r.status)) && (
                <>
                  <button
                    className="inline-action"
                    aria-label="Approve booking"
                    onClick={() => setDecision({ row: r, approve: true })}
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    className="inline-action danger"
                    aria-label="Reject booking"
                    onClick={() => setDecision({ row: r, approve: false })}
                  >
                    <X size={14} /> Reject
                  </button>
                </>
              )}
              {r.status === "approved" && (
                <Link href={`${base}/floor-map`} className="inline-action">
                  Allocate bed
                </Link>
              )}
            </>
          )}
        />
      )}
      <div className="inline-notice finance-note">
        <ShieldCheck size={17} /> Approval creates an unallocated resident
        profile. A bed becomes occupied only after a separate allocation.
      </div>
      {decision && (
        <FormDialog
          title={decision.approve ? "Approve booking" : "Reject booking"}
          description={`${text(decision.row.full_name)} · ${text(decision.row.reference)}. ${decision.approve ? "This does not reserve or assign a bed." : "Please record a reason for the applicant."}`}
          fields={[
            {
              name: "notes",
              label: "Decision notes",
              type: "textarea",
              required: !decision.approve,
              placeholder: "Add context for this decision…",
            },
          ]}
          submitLabel={decision.approve ? "Approve booking" : "Reject booking"}
          onSubmit={submit}
          onClose={() => setDecision(null)}
        />
      )}{" "}
      {detail && (
        <Dialog
          title={`Booking ${text(detail.reference)}`}
          onClose={() => setDetail(null)}
        >
          <dl className="profile-details">
            {[
              ["Applicant", "full_name"],
              ["Email", "email"],
              ["Phone", "phone"],
              ["University", "university"],
              ["Requested", "created_at"],
              ["Status", "status"],
            ].map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {key === "created_at" ? date(detail[key]) : text(detail[key])}
                </dd>
              </div>
            ))}
          </dl>
          <div className="dialog-body">
            <p>{text(detail.notes, "No additional notes.")}</p>
          </div>
        </Dialog>
      )}
    </>
  );
}
