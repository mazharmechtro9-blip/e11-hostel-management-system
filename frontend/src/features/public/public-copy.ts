import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Bus,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Utensils,
  WashingMachine,
  Wifi,
} from "lucide-react";

export const facilities: {
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
}[] = [
  {
    icon: BedDouble,
    title: "Furnished rooms",
    description: "Settle in from day one.",
    detail:
      "Comfortable shared spaces with essential furnishings, study space, and personal storage. See each room category for its included amenities.",
  },
  {
    icon: Wifi,
    title: "Connected living",
    description: "Study, stream, stay connected.",
    detail:
      "WiFi access supports everyday study and communication. Ask our team about the current connection and fair-use policy.",
  },
  {
    icon: Utensils,
    title: "Daily mess",
    description: "Good food. One less worry.",
    detail:
      "Stay up to date with the weekly mess menu and meal announcements through your resident portal.",
  },
  {
    icon: Bus,
    title: "Pick & drop",
    description: "A smoother university commute.",
    detail:
      "View configured university routes, pickup points, and service schedules. Route availability is confirmed by our team.",
  },
  {
    icon: ShieldCheck,
    title: "Secure living",
    description: "A place to feel at ease.",
    detail:
      "Defined hostel rules, authorized staff, and a resident support process help keep shared living organized.",
  },
  {
    icon: WashingMachine,
    title: "Laundry support",
    description: "More time for what matters.",
    detail:
      "Ask the team about current laundry arrangements, service timings, and any additional charges.",
  },
  {
    icon: Sparkles,
    title: "Clean shared spaces",
    description: "A fresh start, every day.",
    detail:
      "Cleaning and maintenance requests can be tracked through the resident portal, keeping the team and residents connected.",
  },
  {
    icon: HeartHandshake,
    title: "Resident support",
    description: "Real people, ready to help.",
    detail:
      "Raise a support request, follow its progress, and receive updates from the operations team in one place.",
  },
];

export const faqItems = [
  [
    "How do I book a seat?",
    "Choose a room category, fill in the booking request, and keep your booking reference. Our team reviews the request and contacts you. Approval and room allocation are separate steps; submitting a request does not reserve or occupy a bed.",
  ],
  [
    "Are prices per room or per student?",
    "The displayed monthly rates are per student. Your confirmed allocation and invoice show the agreed amount. Please check included facilities and any additional service charges with the team before accepting an allocation.",
  ],
  [
    "Can I choose my room or roommate?",
    "Add your preferences in the booking notes. The team considers them alongside actual room and bed availability. A preference is not a guarantee.",
  ],
  [
    "Is transport available for my university?",
    "Pick & drop depends on the configured routes and available capacity. Include your university in your booking request so the team can confirm the right route and schedule.",
  ],
  [
    "How can I see the mess menu?",
    "Residents can see the weekly menu and meal notices in their portal. For current arrangements before booking, contact the hostel team.",
  ],
  [
    "How do rent payments work?",
    "Residents receive an invoice and can download a challan from their portal. Payment receipts can be submitted for review. A receipt submission is not a verified payment; authorized staff must reconcile and verify it.",
  ],
  [
    "Are the images actual hostel photographs?",
    "The illustrations currently shown are labeled concept illustrations. They show the design direction and are not photographs or a promise of an exact room layout. Real property photos will be added by the owner.",
  ],
  [
    "What is the cancellation or refund policy?",
    "Please read the current policy and confirm any deposits or cancellation conditions with the hostel team before making a payment. Your booking request itself does not collect a payment.",
  ],
  [
    "Can I visit before making a decision?",
    "Contact the hostel team to arrange a visit. Visiting hours and availability must be confirmed directly.",
  ],
];
