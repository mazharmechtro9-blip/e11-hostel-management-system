"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BedDouble,
  Bus,
  CirclePlay,
  Headphones,
  MapPin,
  ShieldCheck,
  Wifi,
  Utensils,
  Check,
  Building2,
} from "lucide-react";
import { usePublicRooms, usePublicSettings } from "./public-data";
import {
  RoomCards,
  TourModal,
  FacilitiesGrid,
  SectionTitle,
} from "./public-components";

export function Home() {
  const [tour, setTour] = useState(false);
  const rooms = usePublicRooms();
  const settings = usePublicSettings();
  const available = rooms.data?.items.reduce(
    (sum, room) => sum + room.available_beds,
    0,
  );
  return (
    <>
      <section className="premium-hero">
        <Image
          className="premium-hero-photo"
          src={settings.data?.hero_image_url || "/photos/building.png"}
          alt="Illustrative architectural photograph placeholder; not the actual E-11 property"
          fill
          priority
          unoptimized
          sizes="100vw"
        />
        <div className="premium-hero-shade" />
        <div className="pub-container premium-hero-content">
          <span className="premium-location">
            <MapPin size={13} /> E-11, ISLAMABAD <span /> STUDENT LIVING,
            ELEVATED
          </span>
          <h1>
            Your <em>Home</em> Away
            <br />
            From <em>Home.</em>
          </h1>
          <p>
            A comfortable room. A safer everyday.
            <br />
            Everything you need to make your next chapter yours.
          </p>
          <div className="premium-hero-badges">
            <span>
              <ShieldCheck size={16} /> Secure living
            </span>
            <span>
              <Wifi size={16} /> Connected spaces
            </span>
            <span>
              <Bus size={16} /> Pick & drop
            </span>
          </div>
          <div className="premium-hero-actions">
            <Link href="/booking" className="pub-button pub-button-primary">
              Book your seat <ArrowRight size={16} />
            </Link>
            <button className="premium-tour" onClick={() => setTour(true)}>
              <CirclePlay size={20} /> Virtual tour information
            </button>
          </div>
          <div className="premium-hero-bottom">
            <span>
              <i />{" "}
              {available === undefined
                ? "Checking availability…"
                : `${available} seats available`}{" "}
              <b>·</b> Live inventory
            </span>
            <span>
              <Building2 size={15} /> A smarter way to call it home
            </span>
          </div>
        </div>
        <span className="premium-photo-label">
          Illustrative photo placeholder · Not the actual property
        </span>
      </section>
      <section
        className="premium-benefits pub-container"
        aria-label="Hostel benefits"
      >
        {[
          {
            icon: Wifi,
            title: "Modern facilities",
            text: "WiFi, furnished rooms & daily essentials",
          },
          {
            icon: ShieldCheck,
            title: "Safe & secure",
            text: "Resident support and secure living",
          },
          {
            icon: Bus,
            title: "Pick & drop",
            text: "University transport, in one portal",
          },
          {
            icon: Headphones,
            title: "Here when you need us",
            text: "Requests, updates & support",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <span>
              <Icon size={21} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="premium-rooms pub-container">
        <div className="premium-section-heading">
          <div>
            <span className="pub-eyebrow">YOUR SPACE. YOUR CHOICE.</span>
            <h2>
              Room Types <span>& Pricing</span>
            </h2>
            <p>Find the right balance of comfort, company and budget.</p>
          </div>
          <Link href="/rooms">
            Compare all rooms <ArrowRight size={15} />
          </Link>
        </div>
        <div className="premium-inventory-grid">
          <div>
            <RoomCards limit={5} />
          </div>
          <aside className="premium-availability">
            <header>
              <h3>Live Availability</h3>
              <span>
                <i /> Database
              </span>
            </header>
            <p>A little room for your next big step.</p>
            {rooms.isError ? (
              <button onClick={() => rooms.refetch()}>
                Retry availability
              </button>
            ) : (
              rooms.data?.items.map((room) => (
                <Link
                  key={room.id}
                  href={`/booking?room=${encodeURIComponent(room.id)}`}
                >
                  <span>
                    <BedDouble size={15} /> {room.name}
                  </span>
                  <b className={room.available_beds ? "" : "full"}>
                    {room.available_beds} seats
                  </b>
                </Link>
              ))
            )}
            <div className="premium-availability-note">
              <ShieldCheck size={17} />
              <span>
                Booking requests are reviewed before a bed is confirmed.
              </span>
            </div>
            <Link href="/booking" className="premium-availability-cta">
              Find my room <ArrowRight size={15} />
            </Link>
          </aside>
        </div>
        <p className="premium-inventory-note">
          <Check size={13} /> Prices per student, per month · Availability comes
          from the hostel database.{" "}
          <span>Photos are placeholders, not actual room photographs.</span>
        </p>
      </section>
      <section className="premium-student-banner pub-container">
        <div>
          <span className="pub-eyebrow">ALREADY PART OF E-11?</span>
          <h2>Your entire stay. One smart portal.</h2>
          <p>Rent, receipts, meals and support—right where you need them.</p>
          <Link className="pub-button pub-button-primary" href="/login">
            Open your portal <ArrowRight size={16} />
          </Link>
        </div>
        <div className="premium-portal-preview">
          <div>
            <span>
              <Building2 size={17} /> E-11 Resident Portal
            </span>
            <ShieldCheck size={18} />
          </div>
          <h3>Less admin. More student life.</h3>
          <div>
            {[
              {
                icon: BedDouble,
                title: "Your room",
                text: "Your space, connected",
              },
              {
                icon: Utensils,
                title: "Daily essentials",
                text: "Meals & transport",
              },
              {
                icon: ShieldCheck,
                title: "Payments & support",
                text: "Clear records. Easier requests.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <span key={title}>
                <Icon size={19} />
                <strong>
                  {title}
                  <small>{text}</small>
                </strong>
                <Check size={15} />
              </span>
            ))}
          </div>
          <Link href="/login">
            Sign in to your dashboard <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="pub-section pub-container premium-facilities">
        <SectionTitle
          eyebrow="EVERYDAY, TAKEN CARE OF"
          title="More than a room. A better routine."
          description="Thoughtfully connected services for your everyday hostel life."
          action={{ href: "/facilities", label: "All facilities" }}
        />
        <FacilitiesGrid />
      </section>
      {tour && <TourModal onClose={() => setTour(false)} />}
    </>
  );
}
