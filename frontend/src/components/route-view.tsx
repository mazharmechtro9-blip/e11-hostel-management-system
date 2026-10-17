"use client";
import PublicSite from "@/features/public/public-site";
import { LoginPage } from "@/features/auth/login";
import { PortalApp } from "@/features/portal/portal-app";
export function RouteView({ route }: { route: string[] }) {
  if (route[0] === "login") return <LoginPage />;
  if (["owner", "warden", "assistant", "student"].includes(route[0]))
    return (
      <PortalApp
        key={route.join("/")}
        role={route[0]}
        page={route[1] || "dashboard"}
      />
    );
  return <PublicSite page={route[0] || "home"} />;
}
