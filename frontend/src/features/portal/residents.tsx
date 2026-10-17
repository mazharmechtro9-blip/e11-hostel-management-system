"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileUp,
  Plus,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { money, rows, text, type Row } from "@/lib/utils";
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
export function Residents() {
  const { role } = usePortal();
  const client = useQueryClient();
  const toast = useToast();
  const [create, setCreate] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);
  const q = useQuery({
    queryKey: ["students"],
    queryFn: () => api("/students?page_size=100"),
  });
  const data = rows(q.data);
  const save = async (values: Record<string, string>) => {
    await api("/students", {
      method: "POST",
      body: JSON.stringify({ ...values, password: values.password || null }),
    });
    await client.invalidateQueries({ queryKey: ["students"] });
    await client.invalidateQueries({ queryKey: ["dashboard"] });
    toast(
      "Student profile created. Allocate an available bed to complete move-in.",
    );
  };
  const exportCSV = () => {
    const headers = [
      "full_name",
      "email",
      "phone",
      "university",
      "room_number",
      "status",
    ];
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map(
            (h) =>
              `"${text(row[h], "")
                .replaceAll('"', '""')
                .replace(/^[=+@-]/, "'")}"`,
          )
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "e11-students.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR COMMUNITY"
        title="Students"
        description="A thoughtfully organized home for every resident."
      >
        <button
          className="btn btn-outline"
          onClick={exportCSV}
          disabled={!data.length}
        >
          <Download size={15} /> Export
        </button>
        {role === "owner" && (
          <button
            className="btn btn-outline"
            onClick={() => setImporting(true)}
          >
            <FileUp size={15} /> Import CSV
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setCreate(true)}>
          <Plus size={16} /> Add student
        </button>
      </PageHeading>
      <div className="stats-inline">
        <section className="surface">
          <span>Registered residents</span>
          <strong>{data.length}</strong>
        </section>
        <section className="surface">
          <span>Room allocated</span>
          <strong>{data.filter((r) => r.room_number).length}</strong>
        </section>
        <section className="surface">
          <span>Awaiting allocation</span>
          <strong>{data.filter((r) => !r.room_number).length}</strong>
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
          searchPlaceholder="Search name, email, room…"
          columns={[
            {
              key: "full_name",
              label: "Student",
              render: (r) => (
                <div className="person-cell">
                  <span className="avatar">
                    {text(r.full_name)
                      .split(" ")
                      .slice(0, 2)
                      .map((v) => v[0])
                      .join("")}
                  </span>
                  <div>
                    <strong>{text(r.full_name)}</strong>
                    <small>{text(r.email)}</small>
                  </div>
                </div>
              ),
            },
            { key: "university", label: "University" },
            {
              key: "room_number",
              label: "Room / bed",
              render: (r) => (
                <>
                  <strong>
                    {r.room_number
                      ? `Room ${text(r.room_number)}`
                      : "Unassigned"}
                  </strong>
                  <small>
                    {r.bed_label
                      ? `Bed ${text(r.bed_label)} · ${text(r.floor_name)}`
                      : "Ready for allocation"}
                  </small>
                </>
              ),
            },
            { key: "phone", label: "Contact" },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge value={r.status} />,
            },
          ]}
          actions={(r) => (
            <button className="inline-action" onClick={() => setDetail(r)}>
              View profile
            </button>
          )}
        />
      )}
      <div className="inline-notice finance-note">
        <ShieldCheck size={17} /> Personal records are available only to
        authorized hostel staff. Student accounts are scoped to their own
        information.
      </div>
      {create && (
        <FormDialog
          title="Add a student"
          description="Create a resident profile. Room allocation is a separate, verified step."
          fields={[
            { name: "full_name", label: "Full name", required: true },
            {
              name: "email",
              label: "Email address",
              type: "email",
              required: true,
            },
            {
              name: "phone",
              label: "Phone number",
              required: true,
              placeholder: "+92 3XX XXXXXXX",
            },
            { name: "guardian_phone", label: "Guardian phone" },
            { name: "university", label: "University" },
            {
              name: "password",
              label: "Initial password",
              type: "password",
              description:
                "Optional. At least 12 characters. Share access through a secure channel.",
            },
          ]}
          submitLabel="Create student"
          onSubmit={save}
          onClose={() => setCreate(false)}
        />
      )}{" "}
      {detail && (
        <Dialog title="Student profile" onClose={() => setDetail(null)}>
          <div className="profile-header">
            <span className="avatar">
              <UserRound size={30} />
            </span>
            <div>
              <h2>{text(detail.full_name)}</h2>
              <p>{text(detail.email)}</p>
              <Badge value={detail.status} />
            </div>
          </div>
          <dl className="profile-details">
            {[
              ["Phone", "phone"],
              ["Guardian phone", "guardian_phone"],
              ["University", "university"],
              ["Room", "room_number"],
              ["Bed", "bed_label"],
              ["Monthly rent", "monthly_rent"],
            ].map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {key === "monthly_rent"
                    ? money(detail[key] as number)
                    : text(detail[key])}
                </dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
      {importing && <ImportStudents onClose={() => setImporting(false)} />}
    </>
  );
}
type Preview = {
  preview_id: string | null;
  rows: Row[];
  total: number;
  errors: { row: number; message: string }[];
};
function ImportStudents({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const run = async () => {
    if (!file) return;
    setPending(true);
    setError("");
    try {
      if (file.size > 1024 * 1024)
        throw new Error("Choose a CSV file smaller than 1 MB.");
      setPreview(
        await api<Preview>("/imports/students/preview", {
          method: "POST",
          body: JSON.stringify({ csv_text: await file.text() }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to preview this file.");
    } finally {
      setPending(false);
    }
  };
  const confirm = async () => {
    setPending(true);
    try {
      const r = await api<{ imported: number }>("/imports/students/confirm", {
        method: "POST",
        body: JSON.stringify({ preview_id: preview?.preview_id, confirmation }),
      });
      await client.invalidateQueries({ queryKey: ["students"] });
      toast(`${r.imported} student profiles imported.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import this file.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      title="Import student profiles"
      description="Preview and validate every row before adding records. Existing records will never be silently overwritten."
      onClose={onClose}
    >
      <div className="dialog-body">
        <div className="inline-notice">
          CSV headers: full_name,email,phone,university. Guardian phone is
          optional.
        </div>
        {error && <div className="inline-error">{error}</div>}
        {!preview ? (
          <>
            <label className="receipt-upload">
              <UploadCloud size={27} />
              <p>Select a UTF-8 CSV file, up to 1 MB.</p>
              <input
                aria-label="Student CSV file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <div className="dialog-actions">
              <button
                className="btn btn-primary"
                disabled={!file || pending}
                onClick={run}
              >
                {pending ? "Validating…" : "Preview import"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              <strong>{preview.total} rows</strong> found.{" "}
              {preview.errors.length
                ? "Correct the errors and upload again."
                : "All records passed validation."}
            </p>
            {preview.errors.map((e, i) => (
              <p className="field-error" key={i}>
                Row {e.row}: {e.message}
              </p>
            ))}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td>{text(r.full_name)}</td>
                      <td>{text(r.email)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.preview_id && (
              <label className="field">
                <span>Type IMPORT STUDENTS to confirm</span>
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
            )}
            <div className="dialog-actions">
              <button
                className="btn btn-outline"
                onClick={() => setPreview(null)}
              >
                Choose another file
              </button>
              <button
                className="btn btn-primary"
                disabled={
                  !preview.preview_id ||
                  confirmation !== "IMPORT STUDENTS" ||
                  pending
                }
                onClick={confirm}
              >
                Confirm import
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
