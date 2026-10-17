"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormDialog } from "@/components/ui/primitives";
const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Credentials = z.infer<typeof schema>;
export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  mfa_enabled?: boolean;
};
export type Session = {
  user: User;
  csrf_token: string;
  mfa_required?: boolean;
  mfa_verified?: boolean;
};
export function LoginPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [mfaSession, setMfaSession] = useState<Session | null>(null);
  const config = useQuery({
    queryKey: ["public-settings"],
    queryFn: () =>
      api<{ demo_mode?: boolean; demo_login_enabled?: boolean }>(
        "/public/settings",
      ),
  });
  const complete = (session: Session) => {
    client.setQueryData(["session"], session);
    const path =
      session.user.role === "assistant_warden"
        ? "assistant"
        : session.user.role;
    router.push(
      `/${path}${session.mfa_required && !session.user.mfa_enabled ? "/settings" : ""}`,
    );
  };
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      const session = await api<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (session.mfa_required && session.user.mfa_enabled) {
        setMfaSession(session);
      } else {
        complete(session);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to sign in. Please try again.",
      );
    }
  });
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <BedDouble size={25} />
          </span>
          <span>
            E-11 <b>HOSTEL</b>
            <small>SMART LIVING, SIMPLIFIED</small>
          </span>
        </Link>
        <div className="login-story-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> ONE HOME. ENDLESS POSSIBILITIES.
          </span>
          <h1>
            Good living.
            <br />
            Great possibilities.
          </h1>
          <p>
            Everything that makes hostel life feel a little more like home, in
            one thoughtful place.
          </p>
          <figure className="login-photo">
            <Image
              src="/photos/building.png"
              width={800}
              height={440}
              alt="Architectural photo placeholder; not the actual property"
              priority
            />
            <figcaption>
              Architectural photo placeholder · Not the actual property
            </figcaption>
          </figure>
          <div className="login-trust">
            <ShieldCheck size={20} />
            <span>Secure access. A better everyday experience.</span>
          </div>
        </div>
        <small className="login-story-footer">
          SAFE STAY. BETTER TOMORROW.
        </small>
      </section>
      <section className="login-form-side">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Back to website
        </Link>
        <div className="login-form-wrap">
          <span className="login-symbol">
            <LockKeyhole size={27} />
          </span>
          <span className="eyebrow blue">WELCOME TO YOUR SPACE</span>
          <h2>Welcome back.</h2>
          <p>Sign in to your E-11 Hostel portal.</p>
          <form onSubmit={submit} noValidate>
            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="username"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <small className="field-error">{errors.email.message}</small>
              )}
            </label>
            <label className="field">
              <span>Password</span>
              <div className="password-input">
                <input
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  type={visible ? "text" : "password"}
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <small className="field-error">{errors.password.message}</small>
              )}
            </label>
            <div className="secure-note">
              <ShieldCheck size={14} /> Your session is securely protected.
            </div>
            <button
              disabled={isSubmitting}
              className="btn btn-primary login-submit"
            >
              {isSubmitting ? (
                <LoaderCircle className="spin" size={19} />
              ) : (
                <>
                  Sign in to portal <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          {config.data?.demo_mode &&
            config.data.demo_login_enabled !== false && (
              <details className="demo-login">
                <summary>Explore the development demo</summary>
                <p>
                  Demonstration accounts are available only when development
                  seed data has been explicitly installed.
                </p>
                <div>
                  {["owner", "warden", "assistant", "student"].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => {
                        setValue("email", `${role}@e11.demo`);
                        setValue("password", "E11Demo!2026");
                      }}
                    >
                      {role === "assistant" ? "Assistant warden" : role}
                    </button>
                  ))}
                </div>
                <small>Password: E11Demo!2026</small>
              </details>
            )}
          <p className="login-help">
            Need access? <Link href="/contact">Contact hostel management</Link>
          </p>
        </div>
        <p className="login-legal">
          By signing in, you agree to our <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
      {mfaSession && (
        <FormDialog
          title="Verify your authenticator"
          description="Enter your current six-digit code to complete sign in."
          fields={[
            {
              name: "code",
              label: "Authenticator code",
              required: true,
              placeholder: "123456",
            },
          ]}
          submitLabel="Verify and sign in"
          onSubmit={async (values) => {
            await api("/auth/mfa/verify", {
              method: "POST",
              body: JSON.stringify(values),
            });
            complete({ ...mfaSession, mfa_verified: true });
          }}
          onClose={() => {
            setMfaSession(null);
            void api("/auth/logout", { method: "POST" });
          }}
        />
      )}
    </main>
  );
}
