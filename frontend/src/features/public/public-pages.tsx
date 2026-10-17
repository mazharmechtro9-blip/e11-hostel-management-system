"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  HeartHandshake,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePublicSettings } from "./public-data";
import { faqItems } from "./public-copy";
import { RoomCards, FacilitiesGrid, PageIntro, CTA } from "./public-components";

export function RoomsPage() {
  return (
    <>
      <PageIntro
        eyebrow="ROOMS & PRICING"
        title="Find your kind of space."
        description="A quiet corner to study. Good company to come home to. Explore our room categories and find your fit."
      />
      <section className="pub-section pub-container">
        <div className="pub-room-list-heading">
          <span>
            <span className="pub-live-dot" /> Live room availability
          </span>
          <p>Rates are per student, per month · PKR</p>
        </div>
        <RoomCards />
        <div className="pub-room-help">
          <CircleHelp size={23} />
          <div>
            <strong>Not sure which room is right for you?</strong>
            <p>
              Our team can help you understand the options, inclusions, and
              current availability.
            </p>
          </div>
          <Link className="pub-button pub-button-outline" href="/contact">
            Let’s talk <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <CTA />
    </>
  );
}

export function GalleryPage() {
  const [category, setCategory] = useState("all");
  return (
    <>
      <PageIntro
        eyebrow="A LOOK INSIDE"
        title="Picture your next chapter."
        description="Explore our visual direction while real property photographs are being prepared."
      />
      <section className="pub-section pub-container">
        <div className="pub-gallery-notice">
          <ImageIcon size={22} />
          <div>
            <strong>Every image on this page is a concept illustration.</strong>
            <p>
              These are not photographs of the actual hostel. Layouts, finishes,
              and amenities must be confirmed with our team.
            </p>
          </div>
        </div>
        <div className="pub-tabs" aria-label="Gallery categories">
          {[
            ["all", "All spaces"],
            ["building", "Building & outdoors"],
            ["rooms", "Rooms & living"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="pub-gallery-grid">
          {(category === "all" || category === "building") && (
            <figure className="pub-gallery-building">
              <Image
                width={1000}
                height={820}
                sizes="(max-width: 640px) 100vw, 50vw"
                src="/illustrations/hostel-concept.svg"
                alt="Building and landscaping concept illustration"
              />
              <figcaption>
                <span>CONCEPT ILLUSTRATION</span>
                <strong>A place to come home to.</strong>
                <p>
                  Architectural visual direction · Not a property photograph
                </p>
              </figcaption>
            </figure>
          )}
          {(category === "all" || category === "rooms") && (
            <figure className="pub-gallery-room">
              <Image
                width={1000}
                height={820}
                sizes="(max-width: 640px) 100vw, 50vw"
                src="/illustrations/room-concept.svg"
                alt="Furnished shared room concept illustration"
              />
              <figcaption>
                <span>CONCEPT ILLUSTRATION</span>
                <strong>Make room for possibilities.</strong>
                <p>Room visual direction · Actual layouts may vary</p>
              </figcaption>
            </figure>
          )}
        </div>
        <div className="pub-photo-placeholder">
          <ImageIcon size={30} />
          <h3>The real view is coming.</h3>
          <p>
            Actual property photography, room videos, and a 360° tour can be
            added when available. For now, arrange a visit to see the space for
            yourself.
          </p>
          <Link href="/contact" className="pub-text-link">
            Arrange a visit <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <CTA />
    </>
  );
}

export function FacilitiesPage() {
  const settings = usePublicSettings();
  return (
    <>
      <PageIntro
        eyebrow="EVERYDAY, MADE EASIER"
        title="The little things. Taken care of."
        description="From your first lecture to your last study session, make space for what matters."
      />
      <section className="pub-section pub-container">
        <FacilitiesGrid expanded />
        {settings.data?.facilities?.length ? (
          <div className="pub-configured-facilities">
            <span className="pub-eyebrow">CURRENT PROPERTY FACILITIES</span>
            <h2>What’s included at E-11</h2>
            <div>
              {settings.data.facilities.map((item) => (
                <span key={item}>
                  <Check size={16} />
                  {item}
                </span>
              ))}
            </div>
            <p>
              Specific inclusions and any additional charges are confirmed
              before your allocation.
            </p>
          </div>
        ) : (
          <p className="pub-data-note">
            Confirm current services and any additional charges with the hostel
            team before booking.
          </p>
        )}
      </section>
      <CTA />
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="MEET E-11"
        title="A place to belong. Room to become."
        description="Safe Stay. Better Tomorrow. A simple promise that shapes the way we think about student living."
      />
      <section className="pub-section pub-container">
        <div className="pub-about-story">
          <div>
            <span className="pub-eyebrow">OUR IDEA OF HOME</span>
            <h2>
              Good living makes room
              <br />
              for great things.
            </h2>
            <p>
              Moving to a new city is a big step. Finding a comfortable place to
              live should make that step easier.
            </p>
            <p>
              E-11 Hostel is being built around a straightforward idea: bring
              student essentials together, keep everyday processes clear, and
              give residents a simple way to stay connected with the team.
            </p>
            <p>
              From room choices and meal updates to payment records and
              maintenance requests, the E-11 portal keeps the details in one
              place so you can focus on what comes next.
            </p>
            <Link href="/rooms" className="pub-button pub-button-primary">
              Find your space <ArrowRight size={16} />
            </Link>
          </div>
          <div className="pub-about-art">
            <Image
              width={1000}
              height={820}
              sizes="(max-width: 640px) 100vw, 50vw"
              src="/illustrations/hostel-concept.svg"
              alt="E-11 architectural concept illustration, not an actual photograph"
            />
            <span className="pub-image-label">
              Property concept illustration
            </span>
          </div>
        </div>
        <div className="pub-values-grid">
          {[
            {
              icon: HeartHandshake,
              title: "People first",
              text: "A clear way to ask for help, receive updates, and stay connected.",
            },
            {
              icon: ShieldCheck,
              title: "Clarity at every step",
              text: "Visible booking statuses, itemized invoices, and verified payment records.",
            },
            {
              icon: Sparkles,
              title: "Better everyday living",
              text: "Student essentials, thoughtful spaces, and useful digital tools.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={26} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}

export function FAQPage() {
  const [search, setSearch] = useState("");
  const settings = usePublicSettings();
  const items = faqItems.filter(([question, answer]) =>
    `${question} ${answer}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageIntro
        eyebrow="GOOD QUESTIONS. CLEAR ANSWERS."
        title="A little clarity goes a long way."
        description="Everything you might want to know before your next chapter begins."
      />
      <section className="pub-section pub-container pub-faq-layout">
        <aside>
          <div className="pub-icon-surface">
            <CircleHelp size={29} />
          </div>
          <h2>
            Make yourself
            <br />
            informed.
          </h2>
          <p>Can’t find what you’re looking for? Our team is here to help.</p>
          <Link href="/contact" className="pub-text-link">
            Contact the team <ArrowRight size={16} />
          </Link>
          <label className="pub-faq-search" htmlFor="faq-search">
            Search questions
            <input
              id="faq-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try “booking” or “payment”"
            />
          </label>
        </aside>
        <div className="pub-faq-list">
          {items.map(([question, answer], index) => (
            <details key={question} open={search ? true : undefined}>
              <summary>
                <span>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  {question}
                </span>
                <ChevronDown size={18} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
          {!items.length && (
            <div className="pub-empty">
              <CircleHelp />
              <h3>No matching questions yet.</h3>
              <p>Try another word or contact the team.</p>
            </div>
          )}
          {settings.data?.booking_policy && (
            <div className="pub-current-policy">
              <strong>Current booking policy</strong>
              <p>{settings.data.booking_policy}</p>
            </div>
          )}
          {settings.data?.refund_policy && (
            <div className="pub-current-policy">
              <strong>Current refund policy</strong>
              <p>{settings.data.refund_policy}</p>
            </div>
          )}
        </div>
      </section>
      <CTA />
    </>
  );
}

export function ContactPage() {
  const settings = usePublicSettings();
  const data = settings.data;
  return (
    <>
      <PageIntro
        eyebrow="LET’S TALK"
        title="Your next home starts with a hello."
        description="Questions about rooms, visits, or your next move? We would love to help you find your fit."
      />
      <section className="pub-section pub-container pub-contact-layout">
        <div>
          <span className="pub-eyebrow">CONNECT WITH E-11</span>
          <h2>
            Real questions.
            <br />
            Real conversations.
          </h2>
          <p className="pub-contact-intro">
            Use the configured details below to reach the hostel team. Property
            details shown in this development preview are demonstration
            information.
          </p>
          {settings.isPending && (
            <p role="status">Loading contact information…</p>
          )}
          {settings.isError && (
            <div className="pub-alert" role="alert">
              Contact details could not be loaded.{" "}
              <button onClick={() => settings.refetch()}>Try again</button>
            </div>
          )}
          <div className="pub-contact-details">
            <div>
              <span>
                <MapPin size={22} />
              </span>
              <div>
                <small>FIND US</small>
                <strong>{data?.address || "E-11, Islamabad"}</strong>
                <p>Arrange a visit with the team before arriving.</p>
              </div>
            </div>
            <div>
              <span>
                <Phone size={22} />
              </span>
              <div>
                <small>GIVE US A CALL</small>
                {data?.phone ? (
                  <Link href={`tel:${data.phone.replace(/[^+\d]/g, "")}`}>
                    {data.phone}
                  </Link>
                ) : (
                  <strong>Phone details are being configured.</strong>
                )}
                <p>Ask about rooms, routes, and your next steps.</p>
              </div>
            </div>
            <div>
              <span>
                <Mail size={22} />
              </span>
              <div>
                <small>DROP US A LINE</small>
                {data?.email ? (
                  <Link href={`mailto:${data.email}`}>{data.email}</Link>
                ) : (
                  <strong>Email details are being configured.</strong>
                )}
                <p>Keep your booking reference handy for follow-up.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="pub-contact-card">
          <div className="pub-contact-map">
            <div className="pub-map-grid" />
            <div className="pub-map-pin">
              <Building2 size={29} />
            </div>
            <span>E-11 · ISLAMABAD</span>
            <small>Illustrative location graphic · Not a map pin</small>
          </div>
          <div>
            <h3>Ready to take the next step?</h3>
            <p>
              Send a booking request and the team will follow up using your
              contact details.
            </p>
            <Link href="/booking" className="pub-button pub-button-primary">
              Book your seat <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const settings = usePublicSettings();
  return (
    <>
      <PageIntro
        eyebrow="THE IMPORTANT DETAILS"
        title={
          type === "privacy"
            ? "Your privacy matters."
            : "Clear terms. A better stay."
        }
        description="Development policy draft. The property owner must review and publish final policies before accepting real residents."
      />
      <article className="pub-section pub-container pub-legal">
        {type === "privacy" ? (
          <>
            <h2>What information we collect</h2>
            <p>
              Booking requests collect your name, email address, phone number,
              university, room preference, and any optional notes you provide.
              Authenticated residents can also submit the information needed for
              their room, financial records, and support requests.
            </p>
            <h2>How information is used</h2>
            <p>
              Information is used to review bookings, manage approved stays,
              communicate updates, issue invoices, verify payments, and respond
              to support requests. Access is restricted according to authorized
              account roles and resource ownership.
            </p>
            <h2>Documents and financial information</h2>
            <p>
              Submitted documents and receipts are intended for authorized
              processing. A payment receipt is reviewed as supporting material;
              uploading it does not itself prove or confirm a settled payment.
            </p>
            <h2>Session cookies</h2>
            <p>
              The portal uses authentication session cookies to keep authorized
              users signed in. The current application does not require
              third-party marketing cookies for core functionality.
            </p>
            <h2>Your choices and requests</h2>
            <p>
              Contact the property team to request correction of your
              information or discuss retention and deletion. Financial and
              operational records may need to be retained according to
              applicable obligations. Avoid including unnecessary sensitive
              information in booking notes.
            </p>
            <h2>Policy completion before launch</h2>
            <p>
              The operator must establish the applicable legal basis, retention
              periods, data request process, service providers, incident
              contact, and jurisdiction-specific disclosures before collecting
              production data.
            </p>
          </>
        ) : (
          <>
            <h2>Booking requests and allocation</h2>
            <p>
              Submitting a booking request creates a request for review. It does
              not automatically reserve a seat, activate a resident account, or
              allocate an occupied bed. A booking approval and a room allocation
              are separate steps performed by authorized staff.
            </p>
            <h2>Room prices and availability</h2>
            <p>
              Displayed prices are per student per month unless explicitly
              stated otherwise. Availability comes from current inventory and
              can change. Confirm facilities, service inclusions, additional
              charges, and the agreed amount with the team before accepting an
              allocation.
            </p>
            <h2>Payments and verification</h2>
            <p>
              Use the payment instructions on your official invoice. Uploaded
              receipts require authorized verification against trusted evidence.
              A submitted receipt or pending transaction must not be treated as
              a confirmed payment.
            </p>
            <h2>Property images</h2>
            <p>
              All current building and room visuals are labeled concept
              illustrations. They are not actual photographs or a guarantee of
              exact layouts, furnishings, facilities, or finishes.
            </p>
            <h2>Hostel rules and conduct</h2>
            <p>
              Residents must agree to the property’s approved rules and
              accommodation agreement before moving in. The final agreement
              should cover deposits, due dates, permitted use, safety
              expectations, move-out procedures, and complaint escalation.
            </p>
            <h2>Cancellation and refunds</h2>
            <p>
              {settings.data?.refund_policy ||
                "Cancellation, deposit, and refund conditions must be confirmed in writing with the property team before payment. This booking request does not collect a payment."}
            </p>
            <h2>Current booking policy</h2>
            <p>
              {settings.data?.booking_policy ||
                "All requests are subject to review and availability. The owner must publish final terms before accepting production bookings."}
            </p>
          </>
        )}
        <div className="pub-legal-contact">
          <Mail size={21} />
          <div>
            <strong>Questions about these policies?</strong>
            <p>
              <Link href="/contact">
                Contact the hostel team <ArrowRight size={14} />
              </Link>
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
