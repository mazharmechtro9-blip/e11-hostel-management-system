"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BedDouble,
  Bell,
  Bus,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MessagesSquare,
  ShieldCheck,
  UploadCloud,
  Utensils,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { date, money, rows, text, type Row } from "@/lib/utils";
import { Badge, Empty, ErrorState, Loading } from "@/components/ui/primitives";
import { type DashboardData } from "./dashboard";
import { usePortal } from "./portal-app";
import { PhasePanel, SummaryTile } from "./phase-components";
import "./phase-b.css";
export function StudentDashboard({ data: d }: { data: DashboardData }) {
  const { user } = usePortal();
  const invoices = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api("/invoices?page_size=100"),
  });
  const mess = useQuery({
    queryKey: ["student-mess-preview"],
    queryFn: () => api("/mess"),
  });
  const issued = rows(invoices.data).filter(
    (i) => !["draft", "voided"].includes(text(i.status)),
  );
  const next = issued
    .filter((i) => Number(i.balance) > 0)
    .sort((a, b) => text(a.due_date).localeCompare(text(b.due_date)))[0];
  const recent = d.recent_payments.find((p) => p.status === "verified");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Karachi",
  });
  const menu = rows(mess.data).find((m) => m.day === today);
  const room = d.student?.room as Row | undefined;
  return (
    <div className="student-command">
      <div className="phase-page-title">
        <div>
          <span className="phase-kicker">YOUR STUDENT SPACE</span>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {user.full_name}. Everything for your stay, in one
            place.
          </p>
        </div>
        <Link className="btn btn-soft btn-sm" href="/student/profile">
          <ShieldCheck size={15} /> My profile
        </Link>
      </div>
      <div className="student-summary-grid">
        <SummaryTile
          label="Room no."
          value={text(d.student?.room_number, "Not assigned")}
          detail={
            room
              ? `${text(room.room_type)} · Bed ${text(d.student?.bed_label)}`
              : "Awaiting allocation"
          }
          icon={BedDouble}
        />
        <SummaryTile
          label="Monthly rent"
          value={money(d.student?.monthly_rent as number)}
          detail="Per resident / month"
          icon={Wallet}
        />
        <SummaryTile
          label="Last verified payment"
          value={recent ? money(recent.amount as number) : "No payment yet"}
          detail={
            recent ? date(recent.created_at) : "Awaiting your first payment"
          }
          icon={CheckCircle2}
          tone="green"
        />
        <SummaryTile
          label="Pending dues"
          value={money(d.metrics.outstanding)}
          detail={
            d.metrics.outstanding > 0
              ? "Across your open invoices"
              : "All issued invoices settled"
          }
          icon={Clock3}
          tone={d.metrics.outstanding > 0 ? "amber" : "green"}
        />
      </div>
      <div className="student-primary-grid">
        <PhasePanel
          title="Upcoming dues"
          description="Your earliest unpaid issued invoice"
          className="student-due-panel"
        >
          {invoices.isPending ? (
            <Loading />
          ) : invoices.error ? (
            <ErrorState
              error={invoices.error}
              retry={() => invoices.refetch()}
            />
          ) : next ? (
            <div className="student-due-card">
              <div>
                <span>
                  <FileText size={16} />
                  {text(next.month)}
                </span>
                <Badge value={next.status} />
              </div>
              <strong>{money(next.balance as number)}</strong>
              <p>
                Due date: <b>{date(next.due_date)}</b>
              </p>
              <small>{text(next.number)}</small>
              <a
                className="btn btn-primary"
                href={`/api/v1/invoices/${next.id}/challan`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={15} /> Download challan <ArrowRight size={15} />
              </a>
            </div>
          ) : (
            <div className="student-settled">
              <CheckCircle2 size={34} />
              <h3>You’re all caught up.</h3>
              <p>No unpaid issued invoices right now.</p>
            </div>
          )}
          <Link
            className="student-upload-link"
            href={next ? "/student/payments?receipt=1" : "/student/payments"}
          >
            <UploadCloud size={16} /> Upload payment receipt{" "}
            <ArrowRight size={14} />
          </Link>
        </PhasePanel>
        <PhasePanel
          title="Recent transactions"
          description="Your latest submitted payments"
          href="/student/payments"
        >
          <div className="phase-table-scroll">
            <table className="phase-table">
              <thead>
                <tr>
                  <th>Date / reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.recent_payments.map((r) => (
                  <tr key={text(r.id)}>
                    <td>
                      <strong>{date(r.created_at)}</strong>
                      <small>{text(r.reference)}</small>
                    </td>
                    <td>
                      <strong>{money(r.amount as number)}</strong>
                    </td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!d.recent_payments.length && <Empty title="No transactions yet" />}
        </PhasePanel>
      </div>
      <div className="student-service-links">
        {[
          { href: "my-room", icon: BedDouble, label: "My room" },
          { href: "payments", icon: Wallet, label: "My payments" },
          { href: "complaints", icon: MessagesSquare, label: "Complaints" },
          { href: "mess", icon: Utensils, label: "Mess menu" },
          { href: "transport", icon: Bus, label: "Pick & drop" },
          { href: "notifications", icon: Bell, label: "Notifications" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={`/student/${href}`}>
            <span>
              <Icon size={19} />
            </span>
            <strong>{label}</strong>
            <ArrowRight size={13} />
          </Link>
        ))}
      </div>
      <div className="student-secondary-grid">
        <PhasePanel
          title="Recent complaints / tickets"
          description="Your requests and their latest status"
          href="/student/complaints"
        >
          <div className="student-ticket-list">
            {d.complaints.slice(0, 4).map((c) => (
              <Link key={text(c.id)} href="/student/complaints">
                <span>
                  <MessagesSquare size={16} />
                </span>
                <div>
                  <strong>{text(c.subject || c.title || c.category)}</strong>
                  <small>
                    {text(c.reference)} · {date(c.created_at)}
                  </small>
                </div>
                <Badge value={c.status} />
              </Link>
            ))}
          </div>
          {!d.complaints.length && (
            <div className="phase-empty-note">
              <CheckCircle2 size={18} /> No complaints submitted.
            </div>
          )}
        </PhasePanel>
        <PhasePanel
          title="Today’s mess menu"
          description={today}
          href="/student/mess"
        >
          <div className="student-menu">
            {mess.isPending ? (
              <Loading />
            ) : mess.error ? (
              <ErrorState error={mess.error} retry={() => mess.refetch()} />
            ) : menu ? (
              ["breakfast", "lunch", "dinner"].map((meal, i) => (
                <div key={meal}>
                  <span className={`meal-icon meal-${i}`}>
                    <Utensils size={17} />
                  </span>
                  <div>
                    <strong>{meal}</strong>
                    <p>{text(menu[meal], "Menu not published")}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="phase-empty-note">
                The team has not published today’s menu.
              </div>
            )}
          </div>
        </PhasePanel>
      </div>
      <PhasePanel
        title="Latest updates"
        description="Notices from your hostel team"
        href="/student/notifications"
      >
        <div className="student-notices">
          {d.notices.slice(0, 3).map((n) => (
            <Link href="/student/notifications" key={text(n.id)}>
              <span>
                <Bell size={16} />
              </span>
              <div>
                <strong>{text(n.title)}</strong>
                <p>{text(n.message || n.body)}</p>
                <small>{date(n.created_at)}</small>
              </div>
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
        {!d.notices.length && (
          <div className="phase-empty-note">No new notices.</div>
        )}
      </PhasePanel>
    </div>
  );
}
