"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Expand,
  KeyRound,
  MapPin,
  Menu,
  MoveUpRight,
  ShieldCheck,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { money } from "@/lib/utils";
import { usePublicRooms } from "./public-data";
import type { PublicRoom, PublicSettings } from "./public-data";
import { facilities } from "./public-copy";

export function Logo({
  dark = false,
  settings,
}: {
  dark?: boolean;
  settings?: PublicSettings;
}) {
  const name = settings?.hostel_name || "E-11 Hostel";
  return (
    <Link
      href="/"
      className={`pub-logo${dark ? " pub-logo-light" : ""}`}
      aria-label={`${name} home`}
    >
      <span className="pub-logo-icon">
        <Building2 size={25} strokeWidth={1.7} />
      </span>
      <span>
        {name.toLowerCase() === "e-11 hostel" ? (
          <strong>
            E-11<span>HOSTEL</span>
          </strong>
        ) : (
          <strong className="pub-custom-wordmark">{name}</strong>
        )}
        <small>{settings?.tagline || "SAFE STAY. BETTER TOMORROW."}</small>
      </span>
    </Link>
  );
}

export function Header({
  page,
  settings,
}: {
  page: string;
  settings?: PublicSettings;
}) {
  const [open, setOpen] = useState(false);
  const links = [
    ["/", "Home", "home"],
    ["/rooms", "Rooms & pricing", "rooms"],
    ["/facilities", "Facilities", "facilities"],
    ["/gallery", "Gallery", "gallery"],
    ["/about", "About", "about"],
    ["/contact", "Contact", "contact"],
  ];
  return (
    <>
      {settings?.demo_mode !== false && (
        <div className="pub-preview-bar">
          DEVELOPMENT PREVIEW <span>·</span> Demonstration property details and
          concept illustrations
        </div>
      )}
      <header className="pub-header">
        <div className="pub-container pub-header-inner">
          <Logo settings={settings} />
          <nav
            className={`pub-nav${open ? " pub-nav-open" : ""}`}
            aria-label="Public navigation"
          >
            {links.map(([href, label, key]) => (
              <Link
                key={key}
                href={href}
                aria-current={page === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/faq"
              className="pub-mobile-only"
              aria-current={page === "faq" ? "page" : undefined}
            >
              FAQ
            </Link>
            <Link href="/login" className="pub-mobile-only">
              Resident & staff login
            </Link>
          </nav>
          <div className="pub-header-actions">
            <Link href="/login" className="pub-login">
              <KeyRound size={15} /> Portal login
            </Link>
            <Link
              href="/booking"
              className="pub-button pub-button-primary pub-header-book"
            >
              Book your seat <ArrowRight size={15} />
            </Link>
            <button
              className="pub-menu-button"
              type="button"
              aria-expanded={open}
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="pub-section-heading">
      <div>
        <span className="pub-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <Link className="pub-text-link" href={action.href}>
          {action.label} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

export function RoomModal({
  room,
  onClose,
}: {
  room: PublicRoom;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog className="pub-dialog" ref={dialog} onCancel={onClose}>
      <div className="pub-room-dialog">
        <button
          className="pub-close"
          onClick={onClose}
          aria-label="Close room details"
        >
          <X size={22} />
        </button>
        <Image
          width={1000}
          height={820}
          sizes="(max-width: 640px) 100vw, 50vw"
          src="/illustrations/room-concept.svg"
          alt="Illustrated shared room concept, not an actual property photograph"
        />
        <div className="pub-dialog-body">
          <span className="pub-eyebrow">YOUR OWN CORNER OF ISLAMABAD</span>
          <h2>{room.name}</h2>
          <div className="pub-room-price">
            {money(room.monthly_price)}
            <span>/ student / month</span>
          </div>
          <p>
            A shared room category for {room.capacity} residents. Final room
            layouts, inclusions, and move-in requirements are confirmed by the
            team before allocation.
          </p>
          <div className="pub-dialog-amenities">
            {(room.amenities || []).map((item) => (
              <span key={item}>
                <Check size={15} /> {item}
              </span>
            ))}
          </div>
          <div className="pub-room-policy">
            <ShieldCheck size={20} />
            <p>
              <strong>Booking with confidence</strong>Your request is reviewed
              first. An approved booking and an actual bed allocation are
              confirmed separately. Keep your booking reference for follow-up.
            </p>
          </div>
          <Link
            href={`/booking?room=${encodeURIComponent(room.id)}`}
            className="pub-button pub-button-primary"
          >
            Request this room <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </dialog>
  );
}

export function RoomCards({ limit }: { limit?: number }) {
  const query = usePublicRooms();
  const [selected, setSelected] = useState<PublicRoom | null>(null);
  if (query.isPending)
    return (
      <div
        className="pub-room-grid"
        aria-label="Loading rooms"
        aria-busy="true"
      >
        {[1, 2, 3].map((item) => (
          <div className="pub-room-skeleton" key={item}>
            <div />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  if (query.isError)
    return (
      <div className="pub-empty" role="alert">
        <CircleHelp size={28} />
        <h3>Room availability is taking a moment.</h3>
        <p>
          {query.error instanceof Error
            ? query.error.message
            : "Please check your connection and try again."}
        </p>
        <button
          className="pub-button pub-button-outline"
          onClick={() => query.refetch()}
        >
          Try again
        </button>
      </div>
    );
  const items = query.data.items.slice(0, limit);
  if (!items.length)
    return (
      <div className="pub-empty">
        <BedDouble size={30} />
        <h3>Rooms are being prepared.</h3>
        <p>
          Room categories will appear here when the hostel team publishes them.
        </p>
      </div>
    );
  return (
    <>
      <div className="pub-room-grid">
        {items.map((room, index) => (
          <article className="pub-room-card" key={room.id}>
            <div className={`pub-room-image pub-room-image-${index % 3}`}>
              <Image
                width={1000}
                height={820}
                sizes="(max-width: 640px) 100vw, 50vw"
                src="/illustrations/room-concept.svg"
                alt="Shared room concept illustration; actual room layout may vary"
              />
              <span className="pub-image-label">Concept illustration</span>
              <span className="pub-room-capacity">
                <BedDouble size={14} /> {room.capacity} sharing
              </span>
            </div>
            <div className="pub-room-content">
              <div className="pub-room-name">
                <h3>{room.name}</h3>
                <span
                  className={`pub-availability${room.available_beds ? "" : " pub-availability-full"}`}
                >
                  <i />
                  {room.available_beds ? "Available" : "Full"}
                </span>
              </div>
              <div className="pub-room-price">
                {money(room.monthly_price)}
                <span>/ month</span>
              </div>
              <p className="pub-room-price-note">
                Per student · shared accommodation
              </p>
              <div className="pub-room-amenities">
                {(room.amenities || [])
                  .slice(0, 3)
                  .map((item, amenityIndex) => {
                    const Icon = [Wifi, BookOpen, Wind][amenityIndex];
                    return (
                      <span key={item}>
                        <Icon size={14} /> {item}
                      </span>
                    );
                  })}
              </div>
              <div className="pub-room-bottom">
                <span>
                  <i />
                  {room.available_beds} seats available
                </span>
                <button
                  onClick={() => setSelected(room)}
                  aria-label={`View ${room.name} details`}
                >
                  View details <MoveUpRight size={15} />
                </button>
              </div>
              <Link
                className="pub-room-book"
                href={`/booking?room=${encodeURIComponent(room.id)}`}
              >
                Request this room <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {selected && (
        <RoomModal room={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

export function FacilitiesGrid({ expanded = false }: { expanded?: boolean }) {
  return (
    <div
      className={`pub-facilities-grid${expanded ? " pub-facilities-expanded" : ""}`}
    >
      {facilities.map(({ icon: Icon, title, description, detail }) => (
        <article className="pub-facility" key={title}>
          <div className="pub-facility-icon">
            <Icon size={25} strokeWidth={1.7} />
          </div>
          <h3>{title}</h3>
          <p>{expanded ? detail : description}</p>
        </article>
      ))}
    </div>
  );
}

export function TourModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="pub-dialog pub-tour-dialog"
      onCancel={onClose}
    >
      <button
        className="pub-close"
        onClick={onClose}
        aria-label="Close tour information"
      >
        <X />
      </button>
      <Expand size={35} />
      <span className="pub-eyebrow">A CLOSER LOOK</span>
      <h2>The real view is on its way.</h2>
      <p>
        A 360° property tour has not been uploaded yet. The website currently
        uses clearly labeled concept illustrations. You can contact the team to
        arrange an in-person visit.
      </p>
      <Link href="/contact" className="pub-button pub-button-primary">
        Plan a visit <ArrowRight size={16} />
      </Link>
    </dialog>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="pub-page-intro">
      <div className="pub-container">
        <div className="pub-breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={13} />
          <span>{eyebrow}</span>
        </div>
        <span className="pub-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="pub-intro-ring" />
    </section>
  );
}

export function CTA() {
  return (
    <section className="pub-cta-wrap">
      <div className="pub-container">
        <div className="pub-cta">
          <div className="pub-cta-rings" />
          <div>
            <span className="pub-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>
              A little more comfort.
              <br />A lot more possibility.
            </h2>
            <p>Find your space at E-11. We’ll help with the rest.</p>
          </div>
          <Link href="/booking" className="pub-button pub-button-white">
            Let’s find your room <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer({ settings }: { settings?: PublicSettings }) {
  return (
    <footer className="pub-footer">
      <div className="pub-container">
        <div className="pub-footer-grid">
          <div className="pub-footer-brand">
            <Logo dark settings={settings} />
            <p>
              Comfortable spaces. Connected living.
              <br />A better everyday for students.
            </p>
            <span className="pub-footer-location">
              <MapPin size={15} />{" "}
              {settings?.address || "E-11, Islamabad, Pakistan"}
            </span>
          </div>
          <div>
            <h3>Make yourself at home</h3>
            <Link href="/rooms">Rooms & pricing</Link>
            <Link href="/facilities">Facilities</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/about">About E-11</Link>
          </div>
          <div>
            <h3>We’re here to help</h3>
            <Link href="/faq">Frequently asked questions</Link>
            <Link href="/contact">Contact & visits</Link>
            <Link href="/booking">Book your seat</Link>
            <Link href="/login">
              Resident & staff portal <MoveUpRight size={12} />
            </Link>
          </div>
          <div className="pub-footer-connected">
            <h3>Good things start here.</h3>
            <p>
              Find your space.
              <br />
              Begin your next chapter.
            </p>
            <Link href="/booking" className="pub-footer-contact">
              Get in touch <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="pub-footer-bottom">
          <span>
            © {new Date().getFullYear()}{" "}
            {settings?.hostel_name || "E-11 Hostel"}.{" "}
            {settings?.tagline || "Safe Stay. Better Tomorrow."}
          </span>
          <div>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms & conditions</Link>
          </div>
        </div>
        {settings?.demo_mode !== false && (
          <p className="pub-footer-demo">
            Development preview · Demonstration information · All property
            images are labeled concept illustrations.
          </p>
        )}
      </div>
    </footer>
  );
}
