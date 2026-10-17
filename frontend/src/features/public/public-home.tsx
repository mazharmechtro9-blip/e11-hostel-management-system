"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Bus,
  Check,
  Expand,
  ImageIcon,
  KeyRound,
  MapPin,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wifi,
} from "lucide-react";
import { money } from "@/lib/utils";
import { usePublicRooms } from "./public-data";
import {
  SectionTitle,
  RoomCards,
  FacilitiesGrid,
  TourModal,
  CTA,
} from "./public-components";

export function Home() {
  const [tour, setTour] = useState(false);
  const rooms = usePublicRooms();
  const available = rooms.data?.items.reduce(
    (sum, room) => sum + room.available_beds,
    0,
  );
  const lowest = rooms.data?.items.length
    ? Math.min(...rooms.data.items.map((room) => room.monthly_price))
    : null;
  return (
    <>
      <section className="pub-hero">
        <div className="pub-container pub-hero-grid">
          <div className="pub-hero-copy">
            <div className="pub-hero-pill">
              <span /> A BETTER WAY TO LIVE & LEARN
            </div>
            <h1>
              Your Home
              <br />
              <span>Away From Home</span>
            </h1>
            <p>
              Comfortable rooms, modern facilities, secure living, and reliable
              transport for university students in Islamabad.
            </p>
            <div className="pub-hero-actions">
              <Link className="pub-button pub-button-primary" href="/booking">
                Book your seat <ArrowRight size={18} />
              </Link>
              <Link className="pub-button pub-button-ghost" href="/rooms">
                Explore rooms <MoveUpRight size={17} />
              </Link>
            </div>
            <div className="pub-hero-trust">
              <div className="pub-hero-trust-icon">
                <ShieldCheck size={21} />
              </div>
              <div>
                <strong>Safe stay. Better tomorrow.</strong>
                <span>Space to focus. A community to belong to.</span>
              </div>
            </div>
            <div className="pub-hero-foot">
              <span>
                <MapPin size={14} /> E-11 · Islamabad
              </span>
              <span className="pub-hero-divider" />
              <Link href="/about">
                Made for student life <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="pub-hero-art">
            <div className="pub-art-dots" />
            <div className="pub-art-frame">
              <Image
                width={1000}
                height={820}
                sizes="(max-width: 640px) 100vw, 50vw"
                src="/illustrations/hostel-concept.svg"
                alt="Architectural concept illustration of E-11 Hostel, not an actual property photograph"
              />
              <span className="pub-art-caption">
                <ImageIcon size={12} /> Property concept illustration
              </span>
              <button className="pub-tour-button" onClick={() => setTour(true)}>
                <Expand size={17} />
                <span>360° tour information</span>
              </button>
            </div>
            <div className="pub-art-info">
              <div className="pub-art-info-icon">
                <BedDouble size={22} />
              </div>
              <div>
                <strong>
                  {available === undefined
                    ? "Find your perfect space"
                    : `${available} seats to start your next chapter`}
                </strong>
                <span>
                  {lowest
                    ? `Rooms from ${money(lowest)} / student / month`
                    : "Live availability from our room inventory"}
                </span>
              </div>
              <Link
                href="/rooms"
                aria-label="Explore available room categories"
              >
                <ArrowRight size={19} />
              </Link>
            </div>
            <div className="pub-art-label">
              <span className="pub-label-icon">
                <Sparkles size={18} />
              </span>
              <span>
                Room to grow.
                <br />
                <strong>Space to belong.</strong>
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="pub-trust-strip">
        <div className="pub-container">
          <span>
            Everything you need.
            <br />
            <strong>Nothing to slow you down.</strong>
          </span>
          <div>
            <Wifi /> WiFi connectivity
          </div>
          <div>
            <Utensils /> Daily mess
          </div>
          <div>
            <Bus /> Pick & drop
          </div>
          <div>
            <ShieldCheck /> Resident support
          </div>
        </div>
      </div>
      <section className="pub-section pub-container">
        <SectionTitle
          eyebrow="FIND YOUR SPACE"
          title="A room for every kind of student."
          description="More privacy or more company? Choose the space that feels right for you."
          action={{ href: "/rooms", label: "Explore all rooms" }}
        />
        <RoomCards limit={3} />
        <p className="pub-data-note">
          <span /> Prices and available seats come from the same live inventory
          used by the hostel team.
        </p>
      </section>
      <section className="pub-section pub-facilities-section">
        <div className="pub-container">
          <SectionTitle
            eyebrow="LESS TO WORRY ABOUT. MORE TO LOOK FORWARD TO."
            title="Student life, thoughtfully taken care of."
            description="Your everyday essentials, all under one roof."
          />
          <FacilitiesGrid />
          <div className="pub-centered">
            <Link className="pub-text-link" href="/facilities">
              Discover the little details <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="pub-section pub-container">
        <div className="pub-experience">
          <div className="pub-experience-visual">
            <Image
              width={1000}
              height={820}
              sizes="(max-width: 640px) 100vw, 50vw"
              src="/illustrations/room-concept.svg"
              alt="Illustrated shared room concept, not a photograph of the property"
            />
            <span className="pub-image-label">Room concept illustration</span>
            <div className="pub-experience-note">
              <BookOpen size={23} />
              <div>
                <strong>Built around your goals.</strong>
                <span>A calmer everyday. A brighter tomorrow.</span>
              </div>
            </div>
          </div>
          <div className="pub-experience-copy">
            <span className="pub-eyebrow">MORE THAN A PLACE TO STAY</span>
            <h2>
              A good place to begin
              <br />
              your next chapter.
            </h2>
            <p>
              University life comes with enough new things. Your home should
              make it a little easier. E-11 brings your room, meals, support,
              and everyday essentials together.
            </p>
            <ul>
              <li>
                <Check /> Room options that fit your budget
              </li>
              <li>
                <Check /> One portal for payments, requests, and updates
              </li>
              <li>
                <Check /> A team that keeps you in the loop
              </li>
            </ul>
            <Link href="/about" className="pub-text-link">
              Get to know E-11 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="pub-section pub-how-section">
        <div className="pub-container">
          <SectionTitle
            eyebrow="FROM YOUR FIRST CLICK TO YOUR FIRST DAY"
            title="Moving in starts with three simple steps."
          />
          <div className="pub-how-grid">
            {[
              {
                icon: BedDouble,
                title: "Find your fit",
                text: "Explore room categories, compare monthly prices, and check live availability.",
              },
              {
                icon: BookOpen,
                title: "Send your request",
                text: "Share your details and preferences. Keep the booking reference we create for you.",
              },
              {
                icon: KeyRound,
                title: "Start your next chapter",
                text: "Our team confirms your booking, completes allocation, and helps you settle in.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <div className="pub-how-card" key={title}>
                <div className="pub-how-top">
                  <span>0{index + 1}</span>
                  <Icon size={26} strokeWidth={1.6} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTA />
      {tour && <TourModal onClose={() => setTour(false)} />}
    </>
  );
}
