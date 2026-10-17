"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { date, money, number, rows, text, type Row } from "@/lib/utils";
import { Badge, Empty, ErrorState, Loading } from "@/components/ui/primitives";
import { usePortal } from "./portal-app";
import { StudentDashboard } from "./student-dashboard";
import { OwnerDashboard } from "./owner-dashboard";
export type DashboardData = {
  metrics: Record<string, number>;
  revenue: { month: string; revenue: number; expected: number }[];
  occupancy: { name: string; value: number }[];
  recent_payments: Row[];
  complaints: Row[];
  notices: Row[];
  student?: Row;
};
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
  footer,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  tone?: string;
  footer?: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={21} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="metric-bottom">
        <span>{detail}</span>
        {footer && <small>{footer}</small>}
      </div>
    </article>
  );
}
const chartColors = ["#1677ff", "#19b586", "#f4b646", "#8a63da"];
export function RevenueChart({
  data,
  height = 250,
}: {
  data: DashboardData["revenue"];
  height?: number;
}) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ left: 0, right: 5, top: 15, bottom: 5 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1677ff" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#1677ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#edf0f5"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#5b6e87" }}
            dy={8}
          />
          <YAxis
            tickFormatter={(v) => `${v / 1000}k`}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#5b6e87" }}
            width={40}
          />
          <Tooltip
            formatter={(value) => money(String(value))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5eaf2",
              fontSize: 12,
            }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="expected"
            stroke="#b8cce9"
            strokeDasharray="5 5"
            fill="none"
            name="Expected"
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="revenue"
            stroke="#1677ff"
            strokeWidth={3}
            fill="url(#revenueGradient)"
            name="Collected"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Dashboard() {
  const { user, role, base } = usePortal();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const d = query.data;
  if (role === "owner") return <OwnerDashboard data={d} />;
  if (role === "student") return <StudentDashboard data={d} />;
  const m = d.metrics;
  const student = role === "student";
  const operational = role === "warden" || role === "assistant";
  const first = user.full_name.split(" ")[0];
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">
            <span className="hero-status-dot" /> YOUR HOSTEL, AT A GLANCE
          </span>
          <h1>
            Welcome back, {first}
            <span className="wave">.</span>
          </h1>
          <p>
            {student
              ? "A comfortable stay starts with everything in one place."
              : "Here’s what’s happening at E-11 Hostel today."}
          </p>
          <div className="hero-date">
            <CalendarDays size={14} />
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Karachi",
            })}
            <span /> Islamabad, Pakistan
          </div>
        </div>
        <div className="hero-building">
          <Building2 size={92} strokeWidth={0.8} />
          <span className="hero-building-line" />
          <span className="hero-building-dot" />
        </div>
        <div className="hero-top-tag">
          <ShieldCheck size={13} />{" "}
          {student ? "YOUR HOME, CONNECTED" : "SMART MANAGEMENT"}
        </div>
      </section>
      <div className="section-row">
        <div>
          <span className="section-kicker">THE BIG PICTURE</span>
          <h2>
            {student
              ? "Your stay at a glance"
              : "A little clarity. A lot of control."}
          </h2>
        </div>
        <span className="live-label">
          <i /> Live database overview
        </span>
      </div>
      <div className="metrics-grid">
        {student ? (
          <>
            <MetricCard
              label="My monthly rent"
              value={money(d.student?.monthly_rent as number)}
              detail={text(d.student?.room_number, "No room assigned")}
              icon={BedDouble}
            />
            <MetricCard
              label="Outstanding amount"
              value={money(m.outstanding)}
              detail="Across your open invoices"
              icon={Wallet}
              tone="amber"
            />
            <MetricCard
              label="Verified payments"
              value={money(m.collected)}
              detail="Payments reconciled by management"
              icon={FileCheck2}
              tone="green"
            />
            <MetricCard
              label="Open complaints"
              value={number(m.open_complaints)}
              detail="We’re here to help"
              icon={MessagesSquare}
              tone="violet"
            />
          </>
        ) : (
          <>
            <MetricCard
              label="Total residents"
              value={number(m.students)}
              detail="Registered hostel residents"
              icon={Users}
              footer={`${number(m.rooms)} rooms`}
            />
            <MetricCard
              label="Bed occupancy"
              value={`${m.occupancy_rate || 0}%`}
              detail={`${number(m.occupied_beds)} of ${number(m.total_beds)} beds occupied`}
              icon={BedDouble}
              tone="violet"
            />
            <MetricCard
              label={operational ? "Available beds" : "Collected revenue"}
              value={
                operational ? number(m.available_beds) : money(m.collected)
              }
              detail={
                operational
                  ? "Ready for a new resident"
                  : "Verified payments · all time"
              }
              icon={operational ? Building2 : CircleDollarSign}
              tone="green"
            />
            <MetricCard
              label={operational ? "Open complaints" : "Outstanding dues"}
              value={
                operational ? number(m.open_complaints) : money(m.outstanding)
              }
              detail={
                operational
                  ? "Tickets that need attention"
                  : `${number(m.pending_payments)} payments awaiting review`
              }
              icon={operational ? MessagesSquare : Wallet}
              tone="amber"
            />
          </>
        )}
      </div>
      {student ? (
        <StudentOverview data={d} />
      ) : (
        <div className="dashboard-charts">
          <section className="surface revenue-card">
            <div className="card-heading">
              <div>
                <h3>{operational ? "Hostel occupancy" : "Revenue overview"}</h3>
                <p>
                  {operational
                    ? "Every bed, clearly accounted for."
                    : "A clearer view of your financial performance."}
                </p>
              </div>
              <span className="subtle-tag">Last 6 months</span>
            </div>
            {operational ? (
              <OccupancyBreakdown data={d} />
            ) : (
              <>
                <div className="revenue-summary">
                  <strong>{money(m.collected)}</strong>
                  <span>
                    <i /> Collected <i className="muted" /> Expected
                  </span>
                </div>
                <RevenueChart data={d.revenue || []} />
              </>
            )}
          </section>
          <section className="surface occupancy-card">
            <div className="card-heading">
              <div>
                <h3>Occupancy status</h3>
                <p>Space for every possibility.</p>
              </div>
              <BedDouble size={18} />
            </div>
            <div className="occupancy-chart">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={(d.occupancy || []).filter((v) => v.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={63}
                    outerRadius={82}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {d.occupancy?.map((_, i) => (
                      <Cell
                        key={i}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="occupancy-center">
                <strong>
                  {m.occupancy_rate || 0}
                  <small>%</small>
                </strong>
                <span>OCCUPIED</span>
              </div>
            </div>
            <div className="occupancy-legend">
              {d.occupancy?.map((v, i) => (
                <div key={v.name}>
                  <i
                    style={{ background: chartColors[i % chartColors.length] }}
                  />
                  <span>{v.name}</span>
                  <strong>{v.value}</strong>
                </div>
              ))}
            </div>
            <Link className="card-link" href={`${base}/floor-map`}>
              Explore floor map <ArrowRight size={15} />
            </Link>
          </section>
        </div>
      )}
      <div className="quick-actions">
        <div>
          <span className="quick-action-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <h3>Less searching. More doing.</h3>
            <p>Your everyday essentials, one click away.</p>
          </div>
        </div>
        <div>
          {student ? (
            <>
              <Link className="btn btn-outline" href={`${base}/payments`}>
                <Wallet size={16} /> My payments
              </Link>
              <Link className="btn btn-primary" href={`${base}/complaints`}>
                <Plus size={16} /> Raise a complaint
              </Link>
            </>
          ) : (
            <>
              {role !== "assistant" && (
                <Link className="btn btn-outline" href={`${base}/bookings`}>
                  <CalendarDays size={16} /> Review bookings
                </Link>
              )}
              <Link
                className="btn btn-primary"
                href={`${base}/${role === "assistant" ? "tasks" : "students"}`}
              >
                <Plus size={16} />
                {role === "assistant"
                  ? "View assigned tasks"
                  : "Manage residents"}
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="dashboard-bottom">
        <section className="surface">
          <div className="card-heading">
            <div>
              <h3>
                {student || role === "owner"
                  ? "Recent payments"
                  : "Recent complaints"}
              </h3>
              <p>
                {student || role === "owner"
                  ? "Your latest financial activity."
                  : "Keep things moving smoothly."}
              </p>
            </div>
            <Link
              href={`${base}/${student || role === "owner" ? "payments" : "complaints"}`}
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {student || role === "owner" ? (
            <RecentPayments data={rows(d.recent_payments)} />
          ) : (
            <RecentComplaints data={rows(d.complaints)} />
          )}
        </section>
        <section className="surface">
          <div className="card-heading">
            <div>
              <h3>Notice board</h3>
              <p>A little heads-up for your day.</p>
            </div>
            <Link href={`${base}/notifications`} aria-label="View all notices">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="notice-list">
            {d.notices?.length ? (
              d.notices.slice(0, 3).map((n, i) => (
                <div className="notice-item" key={text(n.id, String(i))}>
                  <span className={`notice-icon notice-${i % 3}`}>
                    <CalendarDays size={17} />
                  </span>
                  <div>
                    <strong>{text(n.title)}</strong>
                    <p>{text(n.message)}</p>
                    <small>{date(n.created_at)}</small>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="All caught up"
                description="New notices from management will appear here."
              />
            )}
          </div>
        </section>
      </div>
      <div className="dashboard-quote">
        <span>E-11 HOSTEL</span>
        <p>Thoughtfully managed. Comfortably lived.</p>
        <ShieldCheck size={20} />
      </div>
    </>
  );
}
function StudentOverview({ data }: { data: DashboardData }) {
  const { base } = usePortal();
  const student = data.student;
  return (
    <div className="student-overview">
      <section className="surface my-room-preview">
        <span className="eyebrow blue">A SPACE TO CALL YOUR OWN</span>
        <div>
          <span className="room-preview-icon">
            <BedDouble size={45} />
          </span>
          <div>
            <h3>
              {student?.room_number
                ? `Room ${text(student.room_number)}`
                : "Your room awaits"}
            </h3>
            <p>
              {text(student?.floor_name, "Room allocation will appear here")}{" "}
              {Boolean(student?.bed_label) &&
                `· Bed ${text(student?.bed_label)}`}
            </p>
            <Badge value={student?.room_number ? "allocated" : "unassigned"} />
          </div>
        </div>
        <Link className="card-link" href={`${base}/my-room`}>
          View my room <ArrowRight size={16} />
        </Link>
      </section>
      <section className="surface">
        <div className="card-heading">
          <div>
            <h3>A little peace of mind</h3>
            <p>Your account, kept in order.</p>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className="student-dues">
          <span>Current outstanding balance</span>
          <strong>{money(data.metrics.outstanding)}</strong>
          <p>Download your challan or submit a receipt for secure review.</p>
          <Link className="btn btn-primary" href={`${base}/payments`}>
            Open my payments <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
function RecentPayments({ data }: { data: Row[] }) {
  return data.length ? (
    <div className="table-scroll">
      <table className="compact-table">
        <thead>
          <tr>
            <th>Resident / reference</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 5).map((p, i) => (
            <tr key={text(p.id, String(i))}>
              <td>
                <strong>
                  {text(
                    p.student_name,
                    p.reference ? text(p.reference) : "Payment",
                  )}
                </strong>
                <small>{text(p.reference, date(p.created_at))}</small>
              </td>
              <td>
                <strong>{money(p.amount as number)}</strong>
              </td>
              <td>
                <Badge value={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="No payments yet"
      description="Recorded payments will appear here."
    />
  );
}
function RecentComplaints({ data }: { data: Row[] }) {
  return (
    <div className="notice-list">
      {data.length ? (
        data.slice(0, 4).map((p, i) => (
          <div className="notice-item" key={text(p.id, String(i))}>
            <span className="notice-icon">
              <MessagesSquare size={18} />
            </span>
            <div>
              <strong>{text(p.title)}</strong>
              <p>
                {text(p.student_name)} · {date(p.created_at)}
              </p>
            </div>
            <Badge value={p.status} />
          </div>
        ))
      ) : (
        <Empty
          title="No complaints"
          description="Your latest tickets will appear here."
        />
      )}
    </div>
  );
}
function OccupancyBreakdown({ data }: { data: DashboardData }) {
  const m = data.metrics;
  return (
    <div className="occupancy-breakdown">
      <span className="large-number">
        {m.occupied_beds}
        <small> / {m.total_beds} beds</small>
      </span>
      <div className="progress-bar">
        <i style={{ width: `${m.occupancy_rate}%` }} />
      </div>
      <div>
        <p>
          <span>Occupied beds</span>
          <strong>{m.occupied_beds}</strong>
        </p>
        <p>
          <span>Vacant beds</span>
          <strong>{m.available_beds}</strong>
        </p>
        <p>
          <span>Open booking requests</span>
          <strong>{m.bookings}</strong>
        </p>
      </div>
      <span className="info-note">
        Availability is calculated from active bed allocations.
      </span>
    </div>
  );
}
