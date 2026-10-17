"use client";
import { useEffect, useState, createContext, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BedDouble,
  Bell,
  ChevronDown,
  ChevronRight,
  Command,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, APIError } from "@/lib/api";
import { type Session, type User } from "@/features/auth/login";
import { navigation, rolePath, roleLabel } from "./navigation";
import { Dialog, Empty, ErrorState, Loading } from "@/components/ui/primitives";
import { useToast } from "@/components/providers";
import { Dashboard } from "./dashboard";
import { Residents } from "./residents";
import { Rooms } from "./rooms";
import { Bookings } from "./bookings";
import { Finance } from "./finance";
import { Operations } from "./operations";
import { Administration } from "./administration";
import { AIChat } from "./ai-chat";
type PortalContext = { user: User; role: string; base: string };
const Context = createContext<PortalContext | null>(null);
export function usePortal() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Portal context missing");
  return ctx;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow blue">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-heading-actions">{children}</div>
    </div>
  );
}
export function PortalApp({ role, page }: { role: string; page: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [finder, setFinder] = useState(false);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(false);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<Session>("/auth/me"),
    retry: false,
  });
  useEffect(() => {
    if (session.error instanceof APIError && session.error.status === 401)
      router.replace("/login");
  }, [session.error, router]);
  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setFinder((s) => !s);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  if (session.isPending)
    return (
      <main className="portal-loading">
        <div className="brand-icon">
          <BedDouble size={26} />
        </div>
        <p>Preparing your workspace…</p>
        <Loading />
      </main>
    );
  if (!session.data)
    return (
      <main className="portal-loading">
        <ErrorState error={session.error} retry={() => session.refetch()} />
        <Link href="/login" className="btn btn-primary">
          Go to sign in
        </Link>
      </main>
    );
  const user = session.data.user;
  const actualRole = rolePath(user.role);
  const nav = navigation(actualRole);
  const current = nav.find((n) => n.id === page);
  if (actualRole !== role)
    return (
      <main className="portal-loading">
        <ShieldCheck size={40} />
        <h1>This workspace requires a different role</h1>
        <p>
          Your signed-in account has access to the {roleLabel(user.role)}{" "}
          portal.
        </p>
        <Link className="btn btn-primary" href={`/${actualRole}`}>
          Open my workspace
        </Link>
      </main>
    );
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      client.clear();
      router.push("/login");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Unable to sign out", true);
    }
  };
  const renderModule = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "students":
        return <Residents />;
      case "floor-map":
      case "rooms":
      case "my-room":
        return (
          <Rooms map={page === "floor-map"} personal={page === "my-room"} />
        );
      case "bookings":
        return <Bookings />;
      case "payments":
      case "invoices":
      case "outstanding":
        return <Finance page={page} />;
      case "complaints":
      case "tasks":
      case "mess":
      case "transport":
      case "notifications":
        return <Operations page={page} />;
      case "ai":
        return <AIChat />;
      default:
        return <Administration page={page} />;
    }
  };
  return (
    <Context.Provider
      value={{ user, role: actualRole, base: `/${actualRole}` }}
    >
      <div className={`portal ${collapsed ? "portal-collapsed" : ""}`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {mobile && (
          <button
            className="mobile-overlay"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className={`sidebar ${mobile ? "sidebar-mobile-open" : ""}`}>
          <Link href={`/${actualRole}`} className="brand">
            <span className="brand-icon">
              <BedDouble size={25} />
            </span>
            <span className="brand-text">
              E-11 <b>HOSTEL</b>
              <small>SMART MANAGEMENT PORTAL</small>
            </span>
          </Link>
          <div className="workspace-switch">
            <span className="workspace-avatar">E</span>
            <div>
              <strong>E-11 Islamabad</strong>
              <small>{roleLabel(user.role)} workspace</small>
            </div>
            <ShieldCheck size={17} />
          </div>
          <nav aria-label="Portal navigation">
            {nav.map((item, index) => (
              <div key={item.id}>
                {(index === 0 || nav[index - 1].group !== item.group) && (
                  <span className="nav-group">{item.group}</span>
                )}
                <Link
                  href={`${actualRole === "student" && item.id === "dashboard" ? "/student" : `/${actualRole}/${item.id === "dashboard" ? "" : item.id}`}`}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  aria-current={page === item.id ? "page" : undefined}
                  title={item.label}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {page === item.id && <span className="nav-active-dot" />}
                  {item.id === "ai" && <span className="nav-new">NEW</span>}
                </Link>
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-help">
              <Sparkles size={20} />
              <strong>A little help, anytime.</strong>
              <p>Your hostel, intelligently connected.</p>
              <Link
                href={
                  actualRole === "owner"
                    ? "/owner/ai"
                    : `/${actualRole}/support`
                }
              >
                Explore your assistant <ArrowUpRight size={14} />
              </Link>
            </div>
            <button
              className="sidebar-collapse"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeftClose size={17} />
              <span>Collapse menu</span>
            </button>
          </div>
        </aside>
        <div className="portal-body">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-btn mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu size={22} />
              </button>
              <span className="breadcrumb">
                Workspace <ChevronRight size={13} />
                <strong>{current?.label || "Page"}</strong>
              </span>
            </div>
            <div className="topbar-right">
              <button
                className="command-search"
                onClick={() => setFinder(true)}
              >
                <Search size={16} />
                <span>Search anything…</span>
                <kbd>
                  <Command size={10} /> K
                </kbd>
              </button>
              <Link className="website-link" href="/" target="_blank">
                View website <ArrowUpRight size={14} />
              </Link>
              <Link
                className="topbar-notification icon-btn"
                aria-label="Notifications"
                href={`/${actualRole}/notifications`}
              >
                <Bell size={20} />
                <i />
              </Link>
              <div className="account-menu">
                <button
                  className="account-trigger"
                  aria-label="Account menu"
                  aria-expanded={account}
                  onClick={() => setAccount(!account)}
                >
                  <span className="avatar">
                    {user.full_name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{user.full_name}</strong>
                    <small>{roleLabel(user.role)}</small>
                  </span>
                  <ChevronDown size={14} />
                </button>
                {account && (
                  <div className="account-dropdown">
                    <Link href={`/${actualRole}/profile`}>My profile</Link>
                    <Link href={`/${actualRole}/settings`}>
                      Security settings
                    </Link>
                    <button onClick={logout}>
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="demo-strip">
            <span className="demo-dot" />
            <strong>DEVELOPMENT WORKSPACE</strong>
            <span>Any seeded records are demonstration data.</span>
            <Link href={`/${actualRole}/support`}>
              About this environment <HelpCircle size={13} />
            </Link>
          </div>
          <main id="main-content" className="portal-main">
            {current ? (
              renderModule()
            ) : (
              <>
                <PageHeading
                  title="Page not found"
                  description="This page isn’t available in your workspace."
                />
                <Empty title="Choose a page from the menu" />
                <Link className="btn btn-primary" href={`/${actualRole}`}>
                  Back to overview
                </Link>
              </>
            )}
          </main>
          <footer className="portal-footer">
            <span>
              © {new Date().getFullYear()} E-11 Hostel · Safe Stay. Better
              Tomorrow.
            </span>
            <span>
              <ShieldCheck size={13} /> Secure management workspace
            </span>
          </footer>
        </div>
      </div>
      {finder && (
        <Dialog
          title="Where would you like to go?"
          description="Quickly find a page in your workspace."
          onClose={() => setFinder(false)}
        >
          <div className="command-dialog">
            <div className="search-input">
              <Search size={18} />
              <input
                aria-label="Find a page"
                placeholder="Search pages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              {nav
                .filter((n) =>
                  n.label.toLowerCase().includes(search.toLowerCase()),
                )
                .map((n) => (
                  <Link
                    key={n.id}
                    onClick={() => {
                      setFinder(false);
                      setSearch("");
                    }}
                    href={`/${actualRole}/${n.id === "dashboard" ? "" : n.id}`}
                  >
                    <n.icon size={18} />
                    {n.label}
                    <ChevronRight size={15} />
                  </Link>
                ))}
            </div>
          </div>
        </Dialog>
      )}
    </Context.Provider>
  );
}
