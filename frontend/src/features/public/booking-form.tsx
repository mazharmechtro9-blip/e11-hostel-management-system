"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { usePublicRooms } from "./public-data";

const bookingSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(254),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(25)
    .regex(/^[+\d\s()-]+$/, "Use digits and a country code, if needed."),
  university: z.string().trim().max(160).optional(),
  room_type_id: z.string().min(1, "Please choose a room preference."),
  notes: z
    .string()
    .trim()
    .max(1500, "Keep your message under 1,500 characters.")
    .optional(),
  consent: z
    .boolean()
    .refine((value) => value, "Please accept the booking terms to continue."),
});
type BookingValues = z.infer<typeof bookingSchema>;

export default function BookingForm() {
  const rooms = usePublicRooms();
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      university: "",
      room_type_id: "",
      notes: "",
      consent: false,
    },
  });

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("room");
    if (selected && rooms.data?.items.some((room) => room.id === selected)) {
      form.setValue("room_type_id", selected);
    }
  }, [rooms.data, form]);

  async function submit(values: BookingValues) {
    setError(null);
    try {
      const payload = {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        university: values.university || "",
        room_type_id: values.room_type_id,
        notes: values.notes || "",
      };
      const result = await api<{ reference: string }>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setReference(result.reference);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not submit your request. Please try again.",
      );
    }
  }

  if (reference) {
    return (
      <div className="pub-booking-success" role="status">
        <div className="pub-success-icon">
          <CheckCircle2 size={38} />
        </div>
        <span className="pub-eyebrow">A NEW CHAPTER AWAITS</span>
        <h2>Booking request received</h2>
        <p>
          Our team will review your request and contact you using the details
          you provided.
        </p>
        <div className="pub-reference">
          <span>Your booking reference</span>
          <strong>{reference}</strong>
        </div>
        <p className="pub-small">
          Please keep this reference. Your request is pending review; a room and
          bed are confirmed separately by our team.
        </p>
        <Link href="/" className="pub-button pub-button-primary">
          Back to home <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="pub-booking-layout">
      <aside className="pub-booking-aside">
        <div className="pub-icon-surface">
          <ShieldCheck size={28} />
        </div>
        <h2>
          A little closer
          <br />
          to feeling at home.
        </h2>
        <p>
          Tell us a little about yourself. We will help you find the space that
          fits your student life.
        </p>
        <ol className="pub-booking-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Share your preferences</strong>
              <p>Pick your room category and send a request.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Let’s connect</strong>
              <p>Our team reviews availability and gets in touch.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Make it your own</strong>
              <p>Complete approval and receive your room allocation.</p>
            </div>
          </li>
        </ol>
        <div className="pub-booking-note">
          <LockKeyhole size={19} />
          <span>
            Your information is used to process your booking. No payment is
            collected on this form.
          </span>
        </div>
      </aside>
      <form
        className="pub-booking-form"
        onSubmit={form.handleSubmit(submit)}
        noValidate
      >
        <div className="pub-form-title">
          <span className="pub-eyebrow">BOOK YOUR SEAT</span>
          <h2>Let’s find your space.</h2>
          <p>Fields marked with an asterisk are required.</p>
        </div>
        {error && (
          <div className="pub-alert" role="alert">
            {error}
          </div>
        )}
        <div className="pub-form-grid">
          <div className="pub-field">
            <label htmlFor="booking-name">
              Full name <span>*</span>
            </label>
            <input
              id="booking-name"
              placeholder="Your full name"
              autoComplete="name"
              aria-invalid={!!form.formState.errors.full_name}
              aria-describedby="booking-name-error"
              {...form.register("full_name")}
            />
            <p id="booking-name-error" className="pub-field-error">
              {form.formState.errors.full_name?.message}
            </p>
          </div>
          <div className="pub-field">
            <label htmlFor="booking-phone">
              Phone number <span>*</span>
            </label>
            <input
              id="booking-phone"
              type="tel"
              placeholder="+92 3XX XXXXXXX"
              autoComplete="tel"
              aria-invalid={!!form.formState.errors.phone}
              aria-describedby="booking-phone-error"
              {...form.register("phone")}
            />
            <p id="booking-phone-error" className="pub-field-error">
              {form.formState.errors.phone?.message}
            </p>
          </div>
          <div className="pub-field pub-field-wide">
            <label htmlFor="booking-email">
              Email address <span>*</span>
            </label>
            <input
              id="booking-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby="booking-email-error"
              {...form.register("email")}
            />
            <p id="booking-email-error" className="pub-field-error">
              {form.formState.errors.email?.message}
            </p>
          </div>
          <div className="pub-field pub-field-wide">
            <label htmlFor="booking-university">University / institution</label>
            <input
              id="booking-university"
              placeholder="Where are you studying?"
              autoComplete="organization"
              {...form.register("university")}
            />
            <p className="pub-field-error">
              {form.formState.errors.university?.message}
            </p>
          </div>
          <div className="pub-field pub-field-wide">
            <label htmlFor="booking-room">
              Room preference <span>*</span>
            </label>
            <select
              id="booking-room"
              disabled={rooms.isPending || rooms.isError}
              aria-invalid={!!form.formState.errors.room_type_id}
              aria-describedby="booking-room-error"
              {...form.register("room_type_id")}
            >
              <option value="">
                {rooms.isPending
                  ? "Loading room categories…"
                  : "Choose your room category"}
              </option>
              {rooms.data?.items.map((room) => (
                <option
                  key={room.id}
                  value={room.id}
                  disabled={!room.available_beds}
                >
                  {room.name} — {money(room.monthly_price)}/month
                  {!room.available_beds
                    ? " · Fully occupied"
                    : ` · ${room.available_beds} seats available`}
                </option>
              ))}
            </select>
            <p id="booking-room-error" className="pub-field-error">
              {form.formState.errors.room_type_id?.message}
            </p>
            {rooms.isError && (
              <p className="pub-field-error" role="alert">
                Room availability could not be loaded.{" "}
                <button type="button" onClick={() => rooms.refetch()}>
                  Try again
                </button>
              </p>
            )}
          </div>
          <div className="pub-field pub-field-wide">
            <label htmlFor="booking-notes">Anything we should know?</label>
            <textarea
              id="booking-notes"
              rows={3}
              placeholder="Your preferred move-in date, questions, or any accessibility needs…"
              {...form.register("notes")}
            />
            <p className="pub-field-error">
              {form.formState.errors.notes?.message}
            </p>
          </div>
        </div>
        <label className="pub-checkbox">
          <input type="checkbox" {...form.register("consent")} />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" rel="noreferrer">
              booking terms
            </Link>{" "}
            and acknowledge the{" "}
            <Link href="/privacy" target="_blank" rel="noreferrer">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {form.formState.errors.consent && (
          <p className="pub-field-error">
            {form.formState.errors.consent.message}
          </p>
        )}
        <button
          className="pub-button pub-button-primary pub-submit"
          disabled={
            form.formState.isSubmitting || rooms.isPending || rooms.isError
          }
          type="submit"
        >
          {form.formState.isSubmitting ? (
            <>
              <LoaderCircle className="pub-spin" size={18} /> Submitting
              request…
            </>
          ) : (
            <>
              Submit booking request <ArrowRight size={18} />
            </>
          )}
        </button>
        <p className="pub-form-footnote">
          <Check size={14} /> No payment required to send a request
        </p>
      </form>
    </div>
  );
}
