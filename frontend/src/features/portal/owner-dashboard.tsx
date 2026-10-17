"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  LayoutGrid,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { date, money, number, text, type Row } from "@/lib/utils";
import { Badge, Empty, ErrorState, Loading } from "@/components/ui/primitives";
import { RevenueChart, type DashboardData } from "./dashboard";
import { usePortal } from "./portal-app";
import "./owner-dashboard.css";

function Panel({
  title,
  subtitle,
  href,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`command-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {href && (
          <Link href={href}>
            View all <ArrowUpRight size={13} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
function QueryMessage({ error, retry }: { error: unknown; retry: () => void }) {
  return error ? <ErrorState error={error} retry={retry} /> : <Loading />;
}
export function OwnerDashboard({
  data: d,
}: {
  data: DashboardData & { demo_mode?: boolean };
}) {
  const { user } = usePortal();
  const [period, setPeriod] = useState(6);
  const floors = useQuery({
    queryKey: ["owner-floor-overview"],
    queryFn: () => api<{ items: Row[] }>("/reports/occupancy"),
  });
  const activity = useQuery({
    queryKey: ["owner-recent-activity"],
    queryFn: () => api<{ items: Row[] }>("/audit-events?limit=4"),
  });
  const queue = useQuery({
    queryKey: ["owner-payment-queue"],
    queryFn: () =>
      api<{ items: Row[]; total: number }>(
        "/payments?status=pending&page_size=3",
      ),
  });
  const m = d.metrics;
  const revenue = (d.revenue || []).slice(-period);
  const total = revenue.reduce((sum, r) => sum + Number(r.revenue), 0);
  const expected = revenue.reduce((sum, r) => sum + Number(r.expected), 0);
  const floorRows = Object.values(
    (floors.data?.items || []).reduce<
      Record<
        string,
        {
          name: string;
          rooms: number;
          occupied: number;
          available: number;
          capacity: number;
        }
      >
    >((acc, r) => {
      const key = String(r.floor_number);
      const f = (acc[key] ||= {
        name: text(r.floor_name),
        rooms: 0,
        occupied: 0,
        available: 0,
        capacity: 0,
      });
      f.rooms++;
      f.occupied += Number(r.occupied_beds);
      f.available += Number(r.available_beds);
      f.capacity += Number(r.capacity);
      return acc;
    }, {}),
  );
  const colors = ["#1677ff", "#16a66a", "#8454d8"];
  return (
    <div className="owner-command">
      <div className="command-heading">
        <div>
          <span className="command-eyebrow">OWNER / MASTER CONTROL</span>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {user.full_name.split(" ")[0]}. Here’s your hostel at
            a glance.
          </p>
        </div>
        <div className="command-heading-actions">
          <span className="command-date">
            <CalendarDays size={14} />
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Karachi",
            })}
          </span>
          <Link className="btn btn-primary btn-sm" href="/owner/bookings">
            <Plus size={15} /> Manage bookings
          </Link>
        </div>
      </div>
      <div className="command-context">
        <span>
          <i /> Database connected <b>·</b> {number(m.rooms)} rooms <b>·</b>{" "}
          {number(m.students)} residents
        </span>
        {d.demo_mode && (
          <span className="command-demo">
            Demo workspace · seeded demonstration data
          </span>
        )}
      </div>
      <div className="command-metrics">
        {[
          {
            label: "Total revenue",
            value: money(m.collected),
            detail: "Verified payments · all time",
            icon: CircleDollarSign,
            tone: "green",
            href: "payments",
          },
          {
            label: "Pending dues",
            value: money(m.outstanding),
            detail: "Balance on issued invoices",
            icon: Wallet,
            tone: "amber",
            href: "outstanding",
          },
          {
            label: "Occupancy",
            value: `${m.occupancy_rate || 0}%`,
            detail: `${number(m.occupied_usable_beds)} / ${number(m.usable_beds)} usable beds`,
            icon: Users,
            tone: "blue",
            href: "floor-map",
          },
          {
            label: "Vacant seats",
            value: number(m.available_beds),
            detail: "Available for new allocations",
            icon: BedDouble,
            tone: "purple",
            href: "rooms",
          },
          {
            label: "Open complaints",
            value: number(m.open_complaints),
            detail: "Open & in-progress tickets",
            icon: MessagesSquare,
            tone: "red",
            href: "complaints",
          },
        ].map(({ label, value, detail, icon: Icon, tone, href }) => (
          <Link
            key={label}
            href={`/owner/${href}`}
            className={`command-metric tone-${tone}`}
          >
            <div>
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
            <span className="command-metric-link">
              <ArrowUpRight size={13} />
            </span>
          </Link>
        ))}
      </div>
      <div className="command-charts">
        <Panel
          title="Revenue trend"
          subtitle="Collected against invoiced rent"
          className="command-revenue"
        >
          <div className="command-chart-controls">
            <div>
              <strong>{money(total)}</strong>
              <span>
                <i /> Collected <i className="expected" /> Invoiced:{" "}
                {money(expected)}
              </span>
            </div>
            <select
              aria-label="Revenue chart period"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              <option value={6}>Last 6 months</option>
              <option value={3}>Last 3 months</option>
            </select>
          </div>
          <RevenueChart data={revenue} height={195} />
        </Panel>
        <Panel
          title="Occupancy analytics"
          subtitle="A clear picture of every usable bed"
          href="/owner/floor-map"
        >
          <div className="command-donut">
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie
                  data={d.occupancy}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={61}
                  outerRadius={79}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {d.occupancy.map((r, i) => (
                    <Cell key={r.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <strong>
                {m.occupancy_rate || 0}
                <small>%</small>
              </strong>
              <span>of usable beds occupied</span>
            </div>
          </div>
          <div className="command-donut-legend">
            {d.occupancy.map((r, i) => (
              <span key={r.name}>
                <i style={{ background: colors[i % colors.length] }} />
                {r.name}
                <b>{number(r.value)}</b>
              </span>
            ))}
          </div>
        </Panel>
      </div>
      <div className="command-three">
        <Panel
          title="Floor overview"
          subtitle="Room and bed allocation"
          href="/owner/floor-map"
        >
          <div className="command-table-scroll">
            <table className="command-table">
              <thead>
                <tr>
                  <th>Floor</th>
                  <th>Rooms</th>
                  <th>Occupied</th>
                  <th>Vacant</th>
                  <th>Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {floorRows.map((f) => (
                  <tr key={f.name}>
                    <td>
                      <Building2 size={13} />
                      {f.name}
                    </td>
                    <td>{f.rooms}</td>
                    <td>{f.occupied}</td>
                    <td className="command-green">{f.available}</td>
                    <td>
                      <span className="command-progress">
                        <i
                          style={{
                            width: `${f.capacity ? (f.occupied / f.capacity) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <small>
                        {f.occupied}/{f.capacity}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!floors.data && (
            <QueryMessage error={floors.error} retry={() => floors.refetch()} />
          )}
        </Panel>
        <Panel
          title="Recent transactions"
          subtitle="Latest payment submissions"
          href="/owner/payments"
        >
          <div className="command-table-scroll">
            <table className="command-table">
              <thead>
                <tr>
                  <th>Resident / date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.recent_payments.slice(0, 4).map((r) => (
                  <tr key={text(r.id)}>
                    <td>
                      <strong>{text(r.student_name)}</strong>
                      <small>{date(r.created_at)}</small>
                    </td>
                    <td>{money(r.amount as number)}</td>
                    <td>
                      <Badge value={text(r.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!d.recent_payments.length && (
            <Empty title="No payments submitted yet" />
          )}
        </Panel>
        <Panel
          title="Recent activity"
          subtitle="Your secure audit trail"
          href="/owner/audit"
        >
          <div className="command-activity">
            {activity.data?.items.map((r, i) => (
              <div key={text(r.id)}>
                <span
                  className={`tone-${["blue", "green", "purple", "amber"][i % 4]}`}
                >
                  <FileCheck2 size={14} />
                </span>
                <div>
                  <strong>
                    {text(r.action).replaceAll(".", " ").replaceAll("_", " ")}
                  </strong>
                  <p>{text(r.actor_name)}</p>
                  <small>{date(r.created_at)}</small>
                </div>
              </div>
            ))}
          </div>
          {!activity.data ? (
            <QueryMessage
              error={activity.error}
              retry={() => activity.refetch()}
            />
          ) : (
            !activity.data.items.length && (
              <Empty title="No activity recorded yet" />
            )
          )}
        </Panel>
      </div>
      <div className="command-three command-bottom">
        <Panel
          title="Payment verification queue"
          subtitle={`${number(m.pending_payments)} submissions awaiting review`}
          href="/owner/payments"
        >
          <div className="command-queue">
            {queue.data?.items.map((r) => (
              <Link key={text(r.id)} href="/owner/payments">
                <span className="command-queue-icon">
                  <FileText size={17} />
                </span>
                <span>
                  <strong>{text(r.student_name)}</strong>
                  <small>{text(r.reference)}</small>
                </span>
                <b>{money(r.amount as number)}</b>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
          {!queue.data ? (
            <QueryMessage error={queue.error} retry={() => queue.refetch()} />
          ) : (
            !queue.data.items.length && (
              <div className="command-all-clear">
                <Check size={18} />
                <span>All caught up. No payments waiting.</span>
              </div>
            )
          )}
        </Panel>
        <Panel
          title="Complaints summary"
          subtitle="Latest resident requests"
          href="/owner/complaints"
        >
          <div className="command-complaints">
            {d.complaints.slice(0, 3).map((r) => (
              <Link href="/owner/complaints" key={text(r.id)}>
                <MessagesSquare size={15} />
                <span>
                  <strong>{text(r.subject || r.title || r.category)}</strong>
                  <small>{text(r.student_name)}</small>
                </span>
                <Badge value={text(r.status)} />
              </Link>
            ))}
          </div>
          {!d.complaints.length && (
            <div className="command-all-clear">
              <ShieldCheck size={18} /> No complaints to display
            </div>
          )}
        </Panel>
        <Panel title="Quick actions" subtitle="Get straight to what matters">
          <div className="command-quick-actions">
            {[
              { href: "students", icon: Users, title: "Manage residents" },
              { href: "invoices", icon: FileText, title: "Rent & invoices" },
              { href: "floor-map", icon: LayoutGrid, title: "Open floor map" },
              {
                href: "reports",
                icon: CircleDollarSign,
                title: "View reports",
              },
              { href: "notifications", icon: Clock3, title: "Send a notice" },
              { href: "website", icon: Building2, title: "Website & photos" },
            ].map(({ href, icon: Icon, title }) => (
              <Link href={`/owner/${href}`} key={href}>
                <Icon size={16} />
                {title}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
