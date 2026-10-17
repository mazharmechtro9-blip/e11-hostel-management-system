"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BusFront,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquareText,
  Plus,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import { api } from "@/lib/api";
import { date, money, rows, text, title, type Row } from "@/lib/utils";
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
import { useToast } from "@/components/providers";
export function Operations({ page }: { page: string }) {
  if (page === "complaints" || page === "tasks")
    return <Complaints tasks={page === "tasks"} />;
  if (page === "mess") return <Mess />;
  if (page === "transport") return <Transport />;
  return <Notifications />;
}
function Complaints({ tasks }: { tasks: boolean }) {
  const { role, user } = usePortal();
  const student = role === "student";
  const q = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api("/complaints?page_size=100"),
  });
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: () => api("/staff"),
    enabled: role === "owner",
  });
  const client = useQueryClient();
  const toast = useToast();
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const all = rows(q.data);
  const data = all.filter(
    (r) =>
      (!tasks || r.assigned_to === user.id) &&
      (!filter || r.status === filter) &&
      `${text(r.title)} ${text(r.description)} ${text(r.reference)} ${text(r.student_name)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(data.length / 6));
  const current = Math.min(page, pages);
  const visible = data.slice((current - 1) * 6, current * 6);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["complaints"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };
  const submit = async (v: Record<string, string>) => {
    await api("/complaints", { method: "POST", body: JSON.stringify(v) });
    await refresh();
    toast("Complaint submitted. You can track updates right here.");
  };
  const update = async (v: Record<string, string>) => {
    const payload = Object.fromEntries(
      Object.entries(v).filter(([, value]) => value !== ""),
    );
    await api(`/complaints/${editing?.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await refresh();
    toast("Complaint updated. The resident will receive a notification.");
  };
  const studentAction = async (r: Row, status: string) => {
    try {
      await api(`/complaints/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
      toast(
        status === "closed"
          ? "Resolution confirmed. Thank you."
          : "Your complaint has been reopened.",
      );
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Unable to update complaint.",
        true,
      );
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="WE’RE HERE TO HELP"
        title={
          tasks ? "Assigned tasks" : student ? "My complaints" : "Complaints"
        }
        description={
          tasks
            ? "Your assigned tickets, with a clear next step."
            : student
              ? "Let us know what needs attention. We’ll take it from here."
              : "Keep the small things from becoming big things."
        }
      >
        {student && (
          <button className="btn btn-primary" onClick={() => setCreate(true)}>
            <Plus size={16} /> New complaint
          </button>
        )}
      </PageHeading>
      <div className="stats-inline">
        <section className="surface">
          <span>Open tickets</span>
          <strong>{all.filter((r) => r.status === "open").length}</strong>
        </section>
        <section className="surface">
          <span>In progress</span>
          <strong>
            {all.filter((r) => r.status === "in_progress").length}
          </strong>
        </section>
        <section className="surface">
          <span>Resolved</span>
          <strong>
            {
              all.filter((r) => ["resolved", "closed"].includes(text(r.status)))
                .length
            }
          </strong>
        </section>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="table-toolbar surface" style={{ marginBottom: 18 }}>
            <div className="search-input">
              <Search size={16} />
              <input
                aria-label="Search complaints"
                placeholder="Search complaints…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Filter complaint status"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {["open", "in_progress", "resolved", "closed"].map((s) => (
                <option key={s} value={s}>
                  {title(s)}
                </option>
              ))}
            </select>
            <span className="table-count">{data.length} tickets</span>
          </div>
          {visible.length ? (
            <div className="module-grid">
              {visible.map((r) => (
                <article className="surface module-card" key={text(r.id)}>
                  <div className="room-card-top">
                    <span>
                      <MessageSquareText size={21} />
                    </span>
                    <Badge value={r.status} />
                  </div>
                  <span className="section-kicker">
                    {text(r.reference)} · {title(text(r.category))}
                  </span>
                  <h3>{text(r.title)}</h3>
                  <p>
                    {text(r.description).slice(0, 145)}
                    {text(r.description).length > 145 ? "…" : ""}
                  </p>
                  {r.response ? (
                    <div className="complaint-response">
                      <strong>Management response</strong>
                      <br />
                      {text(r.response).slice(0, 140)}
                    </div>
                  ) : null}
                  <div className="room-card-bottom">
                    <span className="muted-text">
                      {date(r.created_at)}
                      <br />
                      {!student && text(r.student_name)}
                    </span>
                    <button
                      className="inline-action"
                      onClick={() => setDetail(r)}
                    >
                      View ticket
                    </button>
                  </div>
                  {!student &&
                    (role !== "assistant" || r.assigned_to === user.id) && (
                      <div className="dialog-actions">
                        <button
                          className="btn btn-soft btn-sm"
                          onClick={() => setEditing(r)}
                        >
                          Update complaint
                        </button>
                      </div>
                    )}
                  {student &&
                    ["resolved", "closed"].includes(text(r.status)) && (
                      <div className="dialog-actions">
                        {r.status === "resolved" && (
                          <button
                            className="btn btn-soft btn-sm"
                            onClick={() => studentAction(r, "closed")}
                          >
                            Confirm resolution
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => studentAction(r, "open")}
                        >
                          Reopen ticket
                        </button>
                      </div>
                    )}
                </article>
              ))}
            </div>
          ) : (
            <div className="surface">
              <Empty
                title={
                  tasks
                    ? "No assigned tasks"
                    : search || filter
                      ? "No matching complaints"
                      : "Everything’s looking good"
                }
                description={
                  tasks
                    ? "Tickets assigned to you will appear here."
                    : student
                      ? "When something needs attention, submit a complaint here."
                      : "New resident complaints will appear here."
                }
              />
            </div>
          )}
          <div className="table-pagination">
            <span>{data.length} tickets</span>
            <div>
              <button
                className="icon-btn"
                aria-label="Previous page"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={16} />
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
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
      {create && (
        <FormDialog
          title="New complaint"
          description="Tell us what happened and our team will take a look."
          fields={[
            {
              name: "title",
              label: "Title",
              required: true,
              placeholder: "Briefly describe the issue",
            },
            {
              name: "category",
              label: "Category",
              type: "select",
              required: true,
              options: [
                "maintenance",
                "cleaning",
                "internet",
                "mess",
                "transport",
                "other",
              ].map((s) => ({ value: s, label: title(s) })),
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              required: true,
              description:
                "Include enough detail for the team to help (at least 10 characters).",
            },
            {
              name: "priority",
              label: "Priority",
              type: "select",
              required: true,
              options: ["low", "normal", "high", "urgent"].map((s) => ({
                value: s,
                label: title(s),
              })),
            },
          ]}
          defaults={{ priority: "normal" }}
          submitLabel="Submit complaint"
          onSubmit={submit}
          onClose={() => setCreate(false)}
        />
      )}{" "}
      {editing && (
        <FormDialog
          title="Update complaint"
          description={`${text(editing.reference)} · ${text(editing.title)}`}
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              required: true,
              options: ["open", "in_progress", "resolved", "closed"].map(
                (s) => ({ value: s, label: title(s) }),
              ),
            },
            { name: "response", label: "Response", type: "textarea" },
            ...(role === "owner"
              ? [
                  {
                    name: "assigned_to",
                    label: "Assign to",
                    type: "select" as const,
                    options: rows(staff.data).map((s) => ({
                      value: text(s.id),
                      label: text(s.full_name),
                    })),
                  },
                ]
              : []),
          ]}
          defaults={{
            status: text(editing.status),
            response: text(editing.response, ""),
            assigned_to: text(editing.assigned_to, ""),
          }}
          onSubmit={update}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {detail && (
        <Dialog
          title={text(detail.title)}
          description={text(detail.reference)}
          onClose={() => setDetail(null)}
        >
          <div className="dialog-body">
            <div className="complaint-detail">
              <div>
                Category<strong>{title(text(detail.category))}</strong>
              </div>
              <div>
                Priority<strong>{title(text(detail.priority))}</strong>
              </div>
              <div>
                Created<strong>{date(detail.created_at)}</strong>
              </div>
              <div>
                Status
                <strong>
                  <Badge value={detail.status} />
                </strong>
              </div>
            </div>
            <p>{text(detail.description)}</p>
            <h3 className="section-title">Latest management response</h3>
            <div className="complaint-response">
              {text(
                detail.response,
                "The team will respond here once they have an update.",
              )}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
function Mess() {
  const { role } = usePortal();
  const student = role === "student";
  const q = useQuery({ queryKey: ["mess"], queryFn: () => api<Row>("/mess") });
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Row | null>(null);
  const [counting, setCounting] = useState(false);
  const canMenu = role === "owner" || role === "warden";
  const data = rows(q.data);
  const save = async (v: Record<string, string>) => {
    await api("/mess", { method: "PUT", body: JSON.stringify({ menus: [v] }) });
    await client.invalidateQueries({ queryKey: ["mess"] });
    toast("Weekly menu updated.");
  };
  const count = async (v: Record<string, string>) => {
    await api("/mess", {
      method: "PUT",
      body: JSON.stringify({ counts: [{ ...v, count: Number(v.count) }] }),
    });
    await client.invalidateQueries({ queryKey: ["mess"] });
    toast("Meal count recorded.");
  };
  return (
    <>
      <PageHeading
        eyebrow="GOOD FOOD. GOOD DAYS."
        title={
          student
            ? "Mess menu"
            : role === "assistant"
              ? "Mess counts"
              : "Mess management"
        }
        description="A little comfort, three times a day."
      >
        {!student && (
          <button className="btn btn-primary" onClick={() => setCounting(true)}>
            <Plus size={16} /> Record meal count
          </button>
        )}
      </PageHeading>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="inline-notice">
            <UtensilsCrossed size={17} /> Your weekly menu is maintained by
            hostel management. Please share dietary concerns through a mess
            complaint.
          </div>
          <div className="weekly-menu">
            {data.length ? (
              data.map((r) => (
                <article
                  className="surface menu-day"
                  key={text(r.id, r.day as string)}
                >
                  <h3>{text(r.day)}</h3>
                  {[
                    ["breakfast", "Breakfast"],
                    ["lunch", "Lunch"],
                    ["dinner", "Dinner"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <p>{text(r[key])}</p>
                    </div>
                  ))}
                  {canMenu && (
                    <button
                      className="inline-action"
                      onClick={() => setEditing(r)}
                    >
                      Edit menu
                    </button>
                  )}
                </article>
              ))
            ) : (
              <Empty
                title="The menu is on its way"
                description="Management will publish this week’s meals here."
              />
            )}
          </div>
          {!student && (
            <section className="section-separator">
              <h2 className="section-title">Meal preparation counts</h2>
              <p className="info-note">
                Aggregate quantities help the kitchen prepare enough meals and
                reduce waste.
              </p>
              <DataTable
                data={rows(q.data?.counts)}
                searchPlaceholder="Search date or meal…"
                filterKey="meal"
                columns={[
                  { key: "date", label: "Date", render: (r) => date(r.date) },
                  {
                    key: "meal",
                    label: "Meal",
                    render: (r) => title(text(r.meal)),
                  },
                  {
                    key: "count",
                    label: "Meals prepared",
                    render: (r) => <strong>{text(r.count)}</strong>,
                  },
                ]}
                emptyTitle="No counts recorded"
                emptyDescription="Record a meal count to support kitchen planning."
              />
            </section>
          )}
        </>
      )}
      {editing && (
        <FormDialog
          title={`Edit ${text(editing.day)} menu`}
          fields={[
            {
              name: "day",
              label: "Day",
              type: "select",
              required: true,
              options: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((d) => ({ value: d, label: d })),
            },
            { name: "breakfast", label: "Breakfast", required: true },
            { name: "lunch", label: "Lunch", required: true },
            { name: "dinner", label: "Dinner", required: true },
          ]}
          defaults={Object.fromEntries(
            ["day", "breakfast", "lunch", "dinner"].map((k) => [
              k,
              text(editing[k], ""),
            ]),
          )}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {counting && (
        <FormDialog
          title="Record meal count"
          description="Record an aggregate meal preparation quantity."
          fields={[
            { name: "date", label: "Date", type: "date", required: true },
            {
              name: "meal",
              label: "Meal",
              type: "select",
              required: true,
              options: ["breakfast", "lunch", "dinner"].map((d) => ({
                value: d,
                label: title(d),
              })),
            },
            {
              name: "count",
              label: "Meals prepared",
              type: "number",
              min: 0,
              required: true,
            },
          ]}
          defaults={{ date: new Date().toISOString().slice(0, 10) }}
          submitLabel="Record count"
          onSubmit={count}
          onClose={() => setCounting(false)}
        />
      )}
    </>
  );
}
function Transport() {
  const { role } = usePortal();
  const q = useQuery({
    queryKey: ["transport"],
    queryFn: () => api("/transport"),
  });
  const client = useQueryClient();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const manage = role === "owner" || role === "warden";
  const save = async (v: Record<string, string>) => {
    await api("/transport", {
      method: "POST",
      body: JSON.stringify({
        ...v,
        capacity: Number(v.capacity),
        fee: Number(v.fee),
      }),
    });
    await client.invalidateQueries({ queryKey: ["transport"] });
    toast("Transport route created.");
  };
  return (
    <>
      <PageHeading
        eyebrow="A SMOOTHER EVERYDAY JOURNEY"
        title={role === "student" ? "Pick & drop" : "Transport management"}
        description="Reliable routes from your doorstep to your next possibility."
      >
        {manage && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Add route
          </button>
        )}
      </PageHeading>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <div className="module-grid">
          {rows(q.data).length ? (
            rows(q.data).map((r) => (
              <article key={text(r.id)} className="surface module-card">
                <div className="room-card-top">
                  <span>
                    <BusFront size={23} />
                  </span>
                  <Badge value={r.status} />
                </div>
                <h3>{text(r.name)}</h3>
                <p>{text(r.destination)}</p>
                {[
                  ["Departure", r.departure_time],
                  ["Return", r.return_time],
                  ["Vehicle", r.vehicle],
                  ["Driver", r.driver_name],
                  ["Seats", r.capacity],
                  ["Monthly fee", money(r.fee as number)],
                ].map(([label, value]) => (
                  <div className="transport-detail" key={String(label)}>
                    <span>{String(label)}</span>
                    <strong>{text(value)}</strong>
                  </div>
                ))}
                {Boolean(r.driver_phone) && (
                  <a
                    className="card-link"
                    href={`tel:${text(r.driver_phone)}`}
                    style={{ padding: "17px 0 0", marginTop: 12 }}
                  >
                    Contact driver <BusFront size={14} />
                  </a>
                )}
              </article>
            ))
          ) : (
            <Empty
              title="Routes will appear here"
              description="Management will share transport schedules once routes are configured."
            />
          )}
        </div>
      )}
      <div className="inline-notice finance-note">
        <Clock3 size={17} /> These are published service routes. Contact
        management to confirm your route assignment and current pickup point.
      </div>
      {creating && (
        <FormDialog
          title="Add a transport route"
          fields={[
            { name: "name", label: "Route name", required: true },
            { name: "destination", label: "Destination", required: true },
            {
              name: "departure_time",
              label: "Departure time",
              required: true,
              placeholder: "07:30 (24-hour time)",
            },
            {
              name: "return_time",
              label: "Return time",
              required: true,
              placeholder: "16:30 (24-hour time)",
            },
            { name: "vehicle", label: "Vehicle registration", required: true },
            { name: "driver_name", label: "Driver name", required: true },
            { name: "driver_phone", label: "Driver phone", required: true },
            {
              name: "capacity",
              label: "Seat capacity",
              type: "number",
              min: 1,
              required: true,
            },
            {
              name: "fee",
              label: "Monthly fee (PKR)",
              type: "number",
              min: 0,
              required: true,
            },
          ]}
          submitLabel="Create route"
          onSubmit={save}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
function Notifications() {
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api("/notifications"),
  });
  return (
    <>
      <PageHeading
        eyebrow="IN THE LOOP"
        title="Notifications"
        description="The right updates, right where you need them."
      />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <section className="surface">
          {rows(q.data).length ? (
            rows(q.data).map((r) => (
              <article className="notification-card" key={text(r.id)}>
                <span className="notice-icon">
                  <Bell size={20} />
                </span>
                <div>
                  <h3>{text(r.title)}</h3>
                  <p>{text(r.message)}</p>
                  <small>{date(r.created_at)}</small>
                </div>
                <Badge value={r.kind || "info"} />
              </article>
            ))
          ) : (
            <Empty
              title="You’re all caught up"
              description="New notices, complaint updates, and payment reminders will appear here."
            />
          )}
        </section>
      )}
    </>
  );
}
