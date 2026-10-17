"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BookingForm from "./booking-form";
import { usePublicSettings } from "./public-data";
import "./public.css";
import { Header, PageIntro, Footer } from "./public-components";
import { Home } from "./public-home";
import { PublicAssistant } from "./public-assistant";
import {
  RoomsPage,
  GalleryPage,
  FacilitiesPage,
  AboutPage,
  FAQPage,
  ContactPage,
  LegalPage,
} from "./public-pages";

export default function PublicSite({ page }: { page: string }) {
  const settings = usePublicSettings();
  const normalized = page === "" ? "home" : page;
  return (
    <div className={`pub-site ${normalized === "home" ? "premium-home" : ""}`}>
      <Link className="pub-skip-link" href="#public-main">
        Skip to content
      </Link>
      <Header key={normalized} page={normalized} settings={settings.data} />
      <main id="public-main">
        {normalized === "home" ? (
          <Home />
        ) : normalized === "rooms" ? (
          <RoomsPage />
        ) : normalized === "gallery" ? (
          <GalleryPage />
        ) : normalized === "facilities" ? (
          <FacilitiesPage />
        ) : normalized === "about" ? (
          <AboutPage />
        ) : normalized === "faq" ? (
          <FAQPage />
        ) : normalized === "contact" ? (
          <ContactPage />
        ) : normalized === "booking" ? (
          <>
            <PageIntro
              eyebrow="A PLACE TO CALL YOUR OWN"
              title="Your next chapter starts here."
              description="Choose your room preference. Share a few details. Let us help you feel at home."
            />
            <section className="pub-section pub-container">
              <BookingForm />
            </section>
          </>
        ) : normalized === "privacy" || normalized === "terms" ? (
          <LegalPage type={normalized} />
        ) : (
          <>
            <PageIntro
              eyebrow="LET’S GET YOU HOME"
              title="This space is still being prepared."
              description="Explore our rooms or head back home to find what you need."
            />
            <div className="pub-section pub-container">
              <Link href="/" className="pub-button pub-button-primary">
                Back to home <ArrowRight size={16} />
              </Link>
            </div>
          </>
        )}
      </main>
      <Footer settings={settings.data} />
      <PublicAssistant />
    </div>
  );
}
