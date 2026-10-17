import {
  LayoutDashboard,
  Users,
  Building2,
  Map,
  CalendarCheck2,
  Wallet,
  FileText,
  CircleDollarSign,
  MessagesSquare,
  UtensilsCrossed,
  BusFront,
  ChartNoAxesCombined,
  Sparkles,
  ShieldCheck,
  Bell,
  ScrollText,
  Settings2,
  Globe2,
  UserRound,
  LifeBuoy,
  ClipboardList,
  BedDouble,
} from "lucide-react";
export const allNavigation = [
  {
    id: "dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    group: "WORKSPACE",
  },
  { id: "students", label: "Students", icon: Users, group: "MANAGEMENT" },
  { id: "floor-map", label: "Floor map", icon: Map, group: "MANAGEMENT" },
  { id: "rooms", label: "Rooms & beds", icon: Building2, group: "MANAGEMENT" },
  {
    id: "bookings",
    label: "Bookings",
    icon: CalendarCheck2,
    group: "MANAGEMENT",
  },
  { id: "payments", label: "Payments", icon: Wallet, group: "FINANCE" },
  {
    id: "invoices",
    label: "Rent & invoices",
    icon: FileText,
    group: "FINANCE",
  },
  {
    id: "outstanding",
    label: "Outstanding dues",
    icon: CircleDollarSign,
    group: "FINANCE",
  },
  {
    id: "complaints",
    label: "Complaints",
    icon: MessagesSquare,
    group: "OPERATIONS",
  },
  {
    id: "mess",
    label: "Mess management",
    icon: UtensilsCrossed,
    group: "OPERATIONS",
  },
  { id: "transport", label: "Transport", icon: BusFront, group: "OPERATIONS" },
  {
    id: "reports",
    label: "Reports & analytics",
    icon: ChartNoAxesCombined,
    group: "INSIGHTS",
  },
  { id: "ai", label: "AI assistant", icon: Sparkles, group: "INSIGHTS" },
  {
    id: "staff",
    label: "Staff & permissions",
    icon: ShieldCheck,
    group: "ADMINISTRATION",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    group: "ADMINISTRATION",
  },
  {
    id: "audit",
    label: "Audit logs",
    icon: ScrollText,
    group: "ADMINISTRATION",
  },
  {
    id: "settings",
    label: "System settings",
    icon: Settings2,
    group: "ADMINISTRATION",
  },
  {
    id: "website",
    label: "Public website",
    icon: Globe2,
    group: "ADMINISTRATION",
  },
  { id: "profile", label: "My profile", icon: UserRound, group: "MY ACCOUNT" },
  {
    id: "support",
    label: "Help & support",
    icon: LifeBuoy,
    group: "MY ACCOUNT",
  },
  {
    id: "tasks",
    label: "Assigned tasks",
    icon: ClipboardList,
    group: "OPERATIONS",
  },
  { id: "my-room", label: "My room", icon: BedDouble, group: "MY HOSTEL" },
];
const rolePages: Record<string, string[]> = {
  owner: [
    "dashboard",
    "students",
    "floor-map",
    "rooms",
    "bookings",
    "payments",
    "invoices",
    "outstanding",
    "complaints",
    "mess",
    "transport",
    "reports",
    "ai",
    "staff",
    "notifications",
    "audit",
    "settings",
    "website",
    "profile",
    "support",
  ],
  warden: [
    "dashboard",
    "students",
    "floor-map",
    "rooms",
    "bookings",
    "complaints",
    "mess",
    "transport",
    "reports",
    "notifications",
    "profile",
    "settings",
    "support",
  ],
  assistant: [
    "dashboard",
    "tasks",
    "rooms",
    "complaints",
    "mess",
    "notifications",
    "profile",
    "settings",
    "support",
  ],
  student: [
    "dashboard",
    "profile",
    "my-room",
    "payments",
    "complaints",
    "mess",
    "transport",
    "notifications",
    "settings",
    "support",
  ],
};
export const rolePath = (role: string) =>
  role === "assistant_warden" ? "assistant" : role;
export const roleLabel = (role: string) =>
  ({
    owner: "Owner",
    warden: "Warden",
    assistant: "Assistant warden",
    assistant_warden: "Assistant warden",
    student: "Student",
  })[role] || role;
export function navigation(role: string) {
  return (rolePages[role] || []).map((id) => {
    const item = allNavigation.find((n) => n.id === id)!;
    if (role === "owner")
      return {
        ...item,
        label:
          (
            {
              dashboard: "Dashboard",
              "floor-map": "Visual floor map",
              outstanding: "Pending dues",
              transport: "Pick & drop",
              staff: "Staff & roles",
              settings: "Settings",
            } as Record<string, string>
          )[id] || item.label,
      };
    if (role === "student")
      return {
        ...item,
        label:
          (
            {
              payments: "My payments",
              complaints: "My complaints",
              mess: "Mess menu",
              transport: "Pick & drop",
            } as Record<string, string>
          )[id] || item.label,
      };
    if (role === "assistant" && id === "mess")
      return { ...item, label: "Mess counts" };
    if (role === "warden" && id === "reports")
      return { ...item, label: "Operational reports" };
    return item;
  });
}
