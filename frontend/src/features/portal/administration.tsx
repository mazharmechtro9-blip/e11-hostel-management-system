"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Globe2,
  KeyRound,
  LifeBuoy,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  X,
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
import { DashboardData, MetricCard, RevenueChart } from "./dashboard";
import { PageHeading, usePortal } from "./portal-app";
import { useToast } from "@/components/providers";
export function Administration({ page }: { page: string }) {
  if (page === "reports") return <Reports />;
  if (page === "staff") return <Staff />;
  if (page === "audit") return <Audit />;
  if (page === "profile") return <Profile />;
  if (page === "support") return <Support />;
  if (page === "settings" || page === "website")
    return <Settings website={page === "website"} />;
  return <Empty title="This page isn’t available" />;
}
function Reports() {
  const { role } = usePortal();
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  const roomsQ = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api("/reports/occupancy"),
  });
  return (
    <>
      <PageHeading
        eyebrow="MAKE EVERY DECISION COUNT"
        title={role === "owner" ? "Reports & analytics" : "Operational reports"}
        description="Useful insights, grounded in the numbers that matter."
      />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="metrics-grid">
            <MetricCard
              label="Total rooms"
              value={q.data.metrics.rooms || 0}
              detail="Configured in the database"
              icon={Globe2}
            />
            <MetricCard
              label="Occupied beds"
              value={q.data.metrics.occupied_beds || 0}
              detail={`${q.data.metrics.occupancy_rate || 0}% occupancy`}
              icon={Users}
              tone="green"
            />
            <MetricCard
              label="Available beds"
              value={q.data.metrics.available_beds || 0}
              detail="Based on active allocations"
              icon={BarChart3}
              tone="violet"
            />
            <MetricCard
              label="Open complaints"
              value={q.data.metrics.open_complaints || 0}
              detail="Open and in progress"
              icon={LifeBuoy}
              tone="amber"
            />
          </div>
          {role === "owner" && (
            <section className="surface report-chart">
              <div className="card-heading">
                <div>
                  <h3>Revenue over time</h3>
                  <p>Expected invoices and reconciled collections by month.</p>
                </div>
                <strong>{money(q.data.metrics.collected)}</strong>
              </div>
              <RevenueChart data={q.data.revenue} />
            </section>
          )}
          <section className="section-separator">
            <h2 className="section-title">Room occupancy report</h2>
            {roomsQ.isPending ? (
              <Loading />
            ) : roomsQ.error ? (
              <ErrorState error={roomsQ.error} />
            ) : (
              <DataTable
                data={rows(roomsQ.data)}
                searchPlaceholder="Search room, floor, type…"
                filterKey="floor_name"
                columns={[
                  {
                    key: "number",
                    label: "Room",
                    render: (r) => <strong>Room {text(r.number)}</strong>,
                  },
                  { key: "floor_name", label: "Floor" },
                  { key: "room_type", label: "Room type" },
                  { key: "capacity", label: "Capacity" },
                  { key: "occupied_beds", label: "Occupied beds" },
                  { key: "available_beds", label: "Available beds" },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) => <Badge value={r.status} />,
                  },
                ]}
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
function Staff() {
  const q = useQuery({ queryKey: ["staff"], queryFn: () => api("/staff") });
  const toast = useToast();
  const client = useQueryClient();
  const [create, setCreate] = useState(false);
  const save = async (v: Record<string, string>) => {
    await api("/staff", { method: "POST", body: JSON.stringify(v) });
    await client.invalidateQueries({ queryKey: ["staff"] });
    toast("Staff account created with role-scoped permissions.");
  };
  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE BEHIND THE PLACE"
        title="Staff & permissions"
        description="The right access for the right responsibilities."
      >
        <button className="btn btn-primary" onClick={() => setCreate(true)}>
          <Plus size={16} /> Add staff member
        </button>
      </PageHeading>
      <div className="inline-notice">
        <ShieldCheck size={17} /> Permissions are enforced by the API. Financial
        verification and security administration are restricted to the owner by
        default.
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <DataTable
          data={rows(q.data)}
          filterKey="role"
          columns={[
            {
              key: "full_name",
              label: "Staff member",
              render: (r) => (
                <div className="person-cell">
                  <span className="avatar">
                    {text(r.full_name)
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div>
                    <strong>{text(r.full_name)}</strong>
                    <small>{text(r.email)}</small>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              label: "Role",
              render: (r) => <Badge value={r.role} />,
            },
            {
              key: "is_active",
              label: "Account",
              render: (r) => (
                <Badge value={r.is_active ? "active" : "inactive"} />
              ),
            },
            {
              key: "mfa_enabled",
              label: "Authenticator",
              render: (r) => (r.mfa_enabled ? "Enabled" : "Not configured"),
            },
          ]}
        />
      )}
      <section className="surface section-separator">
        <div className="card-heading">
          <div>
            <h3>Default access policy</h3>
            <p>
              Fixed least-privilege roles. Custom permission editing is reserved
              for a later phase.
            </p>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="table-scroll">
          <table className="permissions-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Owner</th>
                <th>Warden</th>
                <th>Assistant</th>
                <th>Student</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Manage residents", true, true, false, false],
                ["View room information", true, true, true, true],
                ["Allocate beds", true, true, false, false],
                ["Verify payments", true, false, false, false],
                ["Update assigned complaints", true, true, true, false],
                ["Update mess counts", true, true, true, false],
                ["Security administration", true, false, false, false],
              ].map(([label, ...values]) => (
                <tr key={String(label)}>
                  <td>{String(label)}</td>
                  {values.map((v, i) => (
                    <td key={i}>
                      {v ? (
                        <Check
                          className="allowed"
                          size={16}
                          style={{ margin: "auto" }}
                        />
                      ) : (
                        <X
                          className="denied"
                          size={15}
                          style={{ margin: "auto" }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {create && (
        <FormDialog
          title="Add staff member"
          description="Create a role-scoped account. Share the initial password securely."
          fields={[
            { name: "full_name", label: "Full name", required: true },
            {
              name: "email",
              label: "Email address",
              type: "email",
              required: true,
            },
            {
              name: "role",
              label: "Role",
              type: "select",
              required: true,
              options: [
                { value: "warden", label: "Warden" },
                { value: "assistant", label: "Assistant warden" },
              ],
            },
            {
              name: "password",
              label: "Initial password",
              type: "password",
              required: true,
              description: "Use a unique password of at least 12 characters.",
            },
          ]}
          submitLabel="Create staff account"
          onSubmit={save}
          onClose={() => setCreate(false)}
        />
      )}
    </>
  );
}
function Audit() {
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: () => api("/audit-events?limit=500"),
  });
  const [detail, setDetail] = useState<Row | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTABILITY, BY DESIGN"
        title="Audit logs"
        description="A read-only history of sensitive actions across your hostel."
      />
      <div className="inline-notice">
        <ShieldCheck size={17} /> Audit records are append-only through the
        application. Changes include the actor, resource, action, and time.
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <DataTable
          data={rows(q.data)}
          searchPlaceholder="Search actor, action, resource…"
          filterKey="entity"
          columns={[
            {
              key: "created_at",
              label: "When",
              render: (r) => (
                <>
                  {date(r.created_at)}
                  <small>
                    {r.created_at
                      ? new Date(String(r.created_at)).toLocaleTimeString(
                          "en-GB",
                          { timeZone: "Asia/Karachi" },
                        )
                      : ""}{" "}
                    PKT
                  </small>
                </>
              ),
            },
            {
              key: "actor_name",
              label: "Actor",
              render: (r) => <strong>{text(r.actor_name)}</strong>,
            },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <span className="invoice-number">{text(r.action)}</span>
              ),
            },
            {
              key: "entity",
              label: "Resource",
              render: (r) => title(text(r.entity)),
            },
          ]}
          actions={(r) => (
            <button className="inline-action" onClick={() => setDetail(r)}>
              View event
            </button>
          )}
        />
      )}{" "}
      {detail && (
        <Dialog
          title="Audit event"
          description={text(detail.action)}
          onClose={() => setDetail(null)}
        >
          <div className="dialog-body">
            <div className="overview-stat">
              <span>Actor</span>
              <strong>{text(detail.actor_name)}</strong>
            </div>
            <div className="overview-stat">
              <span>Resource</span>
              <strong>{text(detail.entity)}</strong>
            </div>
            <p className="info-note">Event ID: {text(detail.id)}</p>
            <pre className="provisioning-uri">
              {JSON.stringify(detail.details, null, 2)}
            </pre>
          </div>
        </Dialog>
      )}
    </>
  );
}
function Profile() {
  const { user, role } = usePortal();
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<Row>("/profile"),
  });
  const toast = useToast();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const data = q.data || (user as unknown as Row);
  const save = async (v: Record<string, string>) => {
    await api("/profile", { method: "PUT", body: JSON.stringify(v) });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["profile"] }),
      client.invalidateQueries({ queryKey: ["session"] }),
    ]);
    toast("Your profile has been updated.");
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title="My profile"
        description="A few details that make your stay more personal."
      >
        {role === "student" && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit profile
          </button>
        )}
      </PageHeading>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <section className="surface">
          <div className="profile-header">
            <span className="avatar">
              <UserRound size={30} />
            </span>
            <div>
              <h2>{text(data.full_name)}</h2>
              <p>{text(data.email)}</p>
              <Badge value={role} />
            </div>
          </div>
          <dl className="profile-details">
            {[
              ["Email", "email"],
              ["Phone", "phone"],
              ["University", "university"],
              ["Guardian phone", "guardian_phone"],
              ["Room", "room_number"],
              ["Bed", "bed_label"],
            ]
              .filter(([, k]) => role === "student" || ["email"].includes(k))
              .map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{text(data[key])}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
      {editing && (
        <FormDialog
          title="Edit my profile"
          fields={[
            { name: "full_name", label: "Full name", required: true },
            { name: "phone", label: "Phone number", required: true },
            { name: "guardian_phone", label: "Guardian phone" },
            { name: "university", label: "University" },
          ]}
          defaults={Object.fromEntries(
            ["full_name", "phone", "guardian_phone", "university"].map((k) => [
              k,
              text(data[k], ""),
            ]),
          )}
          onSubmit={save}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
function Settings({ website }: { website: boolean }) {
  const { role } = usePortal();
  return (
    <>
      <PageHeading
        eyebrow={
          website ? "A GREAT FIRST IMPRESSION" : "YOUR WORKSPACE, YOUR WAY"
        }
        title={
          website
            ? "Public website settings"
            : role === "owner"
              ? "System settings"
              : "Account settings"
        }
        description={
          website
            ? "Keep your public hostel information fresh and accurate."
            : "Manage the details and security that keep things running smoothly."
        }
      />
      {role === "owner" && <HostelSettings website={website} />}{" "}
      {!website && <SecuritySettings />}
    </>
  );
}
function HostelSettings({ website }: { website: boolean }) {
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Row>("/settings"),
  });
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const data = q.data;
  const value = (key: string) =>
    Array.isArray(data?.[key])
      ? (data[key] as unknown[]).map(String).join("\n")
      : typeof data?.[key] === "object"
        ? JSON.stringify(data[key], null, 2)
        : text(data?.[key], "");
  const save = async (v: Record<string, string>) => {
    const body: Row = { ...v };
    if ("facilities" in body)
      body.facilities = v.facilities
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    await api("/settings", { method: "PUT", body: JSON.stringify(body) });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["settings"] }),
      client.invalidateQueries({ queryKey: ["public", "settings"] }),
    ]);
    toast("Hostel settings saved. Your website will reflect these changes.");
  };
  const keys = website
    ? [
        "about",
        "facilities",
        "booking_policy",
        "refund_policy",
        "house_rules",
        "hero_image_url",
        "room_image_urls",
      ]
    : ["hostel_name", "tagline", "email", "phone", "address"];
  const labels: Record<string, string> = {
    hostel_name: "Hostel name",
    tagline: "Tagline",
    email: "Contact email",
    phone: "Contact phone",
    address: "Address",
    about: "About the hostel",
    facilities: "Facilities",
    booking_policy: "Booking policy",
    refund_policy: "Refund policy",
    house_rules: "House rules",
    hero_image_url: "Homepage photo URL (HTTPS)",
    room_image_urls: "Room photo URLs (one per line, 2 through 6 seater)",
  };
  return q.isPending ? (
    <Loading />
  ) : q.error ? (
    <ErrorState error={q.error} retry={() => q.refetch()} />
  ) : (
    <>
      <section className="surface settings-card">
        <div className="card-heading" style={{ padding: 0, marginBottom: 25 }}>
          <div>
            <h3>
              {website
                ? "Your public information"
                : "Hostel identity & contact"}
            </h3>
            <p>
              {website
                ? "Published content is also used by the public assistant."
                : "A single source of truth for your hostel details."}
            </p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setEditing(true)}
          >
            <Pencil size={14} /> Edit details
          </button>
        </div>
        <dl className="profile-details" style={{ padding: 0 }}>
          {keys.map((key) => (
            <div key={key} style={website ? { gridColumn: "1/-1" } : {}}>
              <dt>{labels[key]}</dt>
              <dd style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {value(key) || "Not configured"}
              </dd>
            </div>
          ))}
        </dl>
        {website && (
          <div className="dialog-actions">
            <Link href="/" target="_blank" className="btn btn-soft">
              Preview public website <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </section>
      {editing && (
        <FormDialog
          title={website ? "Edit public content" : "Edit hostel identity"}
          fields={keys.map((key) => ({
            name: key,
            label: labels[key],
            type: (key === "email"
              ? "email"
              : [
                    "about",
                    "facilities",
                    "booking_policy",
                    "refund_policy",
                    "house_rules",
                    "address",
                    "room_image_urls",
                  ].includes(key)
                ? "textarea"
                : "text") as "text" | "email" | "textarea",
            required: !website,
            description:
              key === "facilities"
                ? "One facility per line."
                : key === "room_image_urls"
                  ? "Five HTTPS photo URLs, in capacity order (2–6). Empty uses labelled placeholders."
                  : key === "hero_image_url"
                    ? "A public HTTPS photo URL. Empty uses the labelled architectural placeholder."
                    : undefined,
          }))}
          defaults={Object.fromEntries(keys.map((k) => [k, value(k)]))}
          onSubmit={save}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
function SecuritySettings() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<Row>("/auth/me"),
  });
  const [password, setPassword] = useState(false);
  const [setup, setSetup] = useState<Row | null>(null);
  const [verify, setVerify] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const client = useQueryClient();
  const user = (session.data?.user || {}) as Row;
  const start = async () => {
    setPending(true);
    try {
      setSetup(await api<Row>("/auth/mfa/setup", { method: "POST" }));
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Unable to set up your authenticator.",
        true,
      );
    } finally {
      setPending(false);
    }
  };
  const confirm = async (v: Record<string, string>) => {
    await api("/auth/mfa/verify", { method: "POST", body: JSON.stringify(v) });
    await client.invalidateQueries({ queryKey: ["session"] });
    setSetup(null);
    toast(
      "Authenticator verified. Your account has an extra layer of protection.",
    );
  };
  return (
    <section className="surface settings-card">
      <h3>Account security</h3>
      <p>
        Your password and authenticator protect access to your personal
        workspace.
      </p>
      <div className="security-status">
        <ShieldCheck size={27} />
        <div>
          <strong>Multi-factor authentication</strong>
          <p>
            {user.mfa_enabled
              ? "Your authenticator is enabled. Verify a fresh code for sensitive actions."
              : "Add an authenticator app for an extra layer of protection."}
          </p>
        </div>
        <Badge value={user.mfa_enabled ? "active" : "not_configured"} />
      </div>
      <div className="page-heading-actions">
        <button className="btn btn-outline" onClick={() => setPassword(true)}>
          <KeyRound size={15} /> Change password
        </button>
        {user.mfa_enabled ? (
          <button className="btn btn-primary" onClick={() => setVerify(true)}>
            Verify authenticator
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={start}
          >
            {pending ? "Preparing…" : "Set up authenticator"}
          </button>
        )}
      </div>
      {password && (
        <FormDialog
          title="Change password"
          description="Use a unique password with at least 12 characters. Other sessions will be signed out."
          fields={[
            {
              name: "current_password",
              label: "Current password",
              type: "password",
              required: true,
            },
            {
              name: "new_password",
              label: "New password",
              type: "password",
              required: true,
              description: "At least 12 characters.",
            },
          ]}
          submitLabel="Update password"
          onSubmit={async (v) => {
            await api("/auth/password", {
              method: "POST",
              body: JSON.stringify(v),
            });
            toast("Password updated. Other sessions have been revoked.");
          }}
          onClose={() => setPassword(false)}
        />
      )}{" "}
      {setup && (
        <Dialog
          title="Connect your authenticator"
          description="Add this provisioning link to your authenticator app, then verify a six-digit code."
          onClose={() => setSetup(null)}
        >
          <div className="dialog-body">
            <p>
              Keep this enrollment link private. It contains your authenticator
              secret.
            </p>
            <pre className="provisioning-uri">
              {text(setup.provisioning_uri)}
            </pre>
            <div className="dialog-actions">
              <button
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      text(setup.provisioning_uri),
                    );
                    toast("Enrollment link copied.");
                  } catch {
                    toast("Copy the enrollment link manually.", true);
                  }
                }}
              >
                <Copy size={14} /> Copy link
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSetup(null);
                  setVerify(true);
                }}
              >
                I’ve added my account
              </button>
            </div>
          </div>
        </Dialog>
      )}{" "}
      {verify && (
        <FormDialog
          title="Verify authenticator"
          description="Enter the current six-digit code from your authenticator app."
          fields={[
            {
              name: "code",
              label: "Authenticator code",
              required: true,
              placeholder: "123456",
            },
          ]}
          submitLabel="Verify code"
          onSubmit={confirm}
          onClose={() => setVerify(false)}
        />
      )}
    </section>
  );
}
function Support() {
  const { role, base } = usePortal();
  const q = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api<Row>("/public/settings"),
  });
  const d = q.data;
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE HELP GOES A LONG WAY"
        title="Help & support"
        description="Find your next step, or get in touch with hostel management."
      />
      <div className="module-grid">
        <section className="surface module-card">
          <span className="module-card-icon">
            <LifeBuoy size={23} />
          </span>
          <h3>Something needs attention?</h3>
          <p>
            {role === "student"
              ? "Open a complaint for room maintenance, cleaning, internet, meals, or transport."
              : "Review current complaints and keep residents informed with a response."}
          </p>
          <Link className="card-link" href={`${base}/complaints`}>
            Open complaints <ArrowUpRight size={14} />
          </Link>
        </section>
        <section className="surface module-card">
          <span className="module-card-icon">
            <Phone size={22} />
          </span>
          <h3>Talk to management</h3>
          <p>
            {text(d?.hostel_name, "Your hostel management")}
            <br />
            {text(d?.phone, "Phone details are being configured.")}
          </p>
          {Boolean(d?.phone) && (
            <a className="card-link" href={`tel:${text(d?.phone)}`}>
              Call management <ArrowUpRight size={14} />
            </a>
          )}
          {Boolean(d?.email) && (
            <a className="card-link" href={`mailto:${text(d?.email)}`}>
              {text(d?.email)} <Mail size={14} />
            </a>
          )}
        </section>
        <section className="surface module-card">
          <span className="module-card-icon">
            <ShieldCheck size={23} />
          </span>
          <h3>Your security matters</h3>
          <p>
            Keep your login details private, use a unique password, and enable
            an authenticator. Management will never ask you to share your
            password.
          </p>
          <Link className="card-link" href={`${base}/settings`}>
            Account security <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
      <section className="surface settings-card section-separator">
        <h3>About this environment</h3>
        <p>
          The application uses a real database and role-based API permissions.
          Development seed records are demonstration data and should be replaced
          before real operations.
        </p>
        <p>
          The assistant currently uses deterministic local retrieval. Live
          language models, messaging, OCR, and live payment gateways require
          additional integration and credentials. Payment receipts require human
          reconciliation against trusted settlement records.
        </p>
        <Link className="btn btn-outline" href="/faq">
          Public FAQ <ArrowUpRight size={14} />
        </Link>
      </section>
    </>
  );
}
