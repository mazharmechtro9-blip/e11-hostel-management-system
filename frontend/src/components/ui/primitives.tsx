"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { title, type Row, text } from "@/lib/utils";
import { useToast } from "@/components/providers";

export function Badge({ value }: { value: unknown }) {
  const s = text(value, "unknown");
  return (
    <span className={`badge badge-${s.toLowerCase().replaceAll(" ", "_")}`}>
      {title(s)}
    </span>
  );
}
export function Loading() {
  return (
    <div className="skeleton-grid" role="status" aria-label="Loading content">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function Empty({
  title: heading = "Nothing here yet",
  description = "New records will appear here as your hostel gets going.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Inbox size={25} />
      </span>
      <h3>{heading}</h3>
      <p>{description}</p>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={26} />
      <h3>We couldn’t load this information</h3>
      <p>
        {error instanceof Error
          ? error.message
          : "Please try again in a moment."}
      </p>
      {retry && (
        <button className="btn btn-outline" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Dialog({
  title: heading,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dialog" onCancel={onClose}>
      <div className="dialog-header">
        <div>
          <h2>{heading}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "password"
    | "date"
    | "month"
    | "textarea"
    | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  description?: string;
};
export function FormDialog({
  title: heading,
  description,
  fields,
  defaults = {},
  submitLabel = "Save changes",
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  fields: Field[];
  defaults?: Record<string, string>;
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Record<string, string>>({ defaultValues: defaults });
  const toast = useToast();
  const submit = handleSubmit(async (values) => {
    const shape: Record<string, z.ZodString> = {};
    for (const f of fields) {
      let field = z.string().trim();
      if (f.required) field = field.min(1, `${f.label} is required`);
      if (f.type === "email" && values[f.name])
        field = field.email("Enter a valid email address");
      shape[f.name] = field;
    }
    const result = z.object(shape).safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues)
        setError(String(issue.path[0]), { message: issue.message });
      return;
    }
    try {
      await onSubmit(result.data);
      onClose();
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "The changes could not be saved.",
        true,
      );
    }
  });
  return (
    <Dialog title={heading} description={description} onClose={onClose}>
      <form onSubmit={submit} className="dialog-form">
        {fields.map((f) => (
          <label className="field" key={f.name}>
            <span>
              {f.label}
              {f.required && <span className="required"> *</span>}
            </span>
            {f.type === "select" ? (
              <select
                {...register(f.name, {
                  required: f.required ? `${f.label} is required` : false,
                })}
              >
                <option value="">Select {f.label.toLowerCase()}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={4}
                placeholder={f.placeholder}
                {...register(f.name, {
                  required: f.required ? `${f.label} is required` : false,
                })}
              />
            ) : (
              <input
                type={f.type || "text"}
                min={f.min}
                placeholder={f.placeholder}
                {...register(f.name, {
                  required: f.required ? `${f.label} is required` : false,
                  min:
                    f.min === undefined
                      ? undefined
                      : { value: f.min, message: `Minimum value is ${f.min}` },
                })}
              />
            )}{" "}
            {f.description && <small>{f.description}</small>}
            {errors[f.name] && (
              <small className="field-error">
                {String(errors[f.name]?.message)}
              </small>
            )}
          </label>
        ))}
        <div className="dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting && <LoaderCircle className="spin" size={16} />}{" "}
            {submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export type Column = {
  key: string;
  label: string;
  render?: (row: Row) => React.ReactNode;
};
export function DataTable({
  data,
  columns,
  searchPlaceholder = "Search records…",
  emptyTitle,
  emptyDescription,
  filterKey,
  actions,
}: {
  data: Row[];
  columns: Column[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  filterKey?: string;
  actions?: (row: Row) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const filtered = data.filter(
    (row) =>
      (!filter || String(row[filterKey || "status"]) === filter) &&
      Object.values(row)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const options = Array.from(
    new Set(
      data.map((r) => String(r[filterKey || "status"] || "")).filter(Boolean),
    ),
  );
  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {filterKey && (
          <select
            aria-label={`Filter by ${title(filterKey)}`}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All {title(filterKey)}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {title(o)}
              </option>
            ))}
          </select>
        )}
        <span className="table-count">{filtered.length} records</span>
      </div>
      {visible.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                {actions && <th className="right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <tr key={text(row.id, String(i))}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(row) : text(row[c.key])}
                    </td>
                  ))}
                  {actions && (
                    <td>
                      <div className="table-actions">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={query || filter ? "No matching results" : emptyTitle}
          description={
            query || filter
              ? "Try a different search or filter."
              : emptyDescription
          }
        />
      )}
      <div className="table-pagination">
        <span>
          {filtered.length
            ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, filtered.length)}`
            : "0"}{" "}
          of {filtered.length} records
        </span>
        <div>
          <button
            className="icon-btn"
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {current} of {pages}
          </span>
          <button
            className="icon-btn"
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
