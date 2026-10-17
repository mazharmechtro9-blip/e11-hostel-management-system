"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PublicRoom {
  id: string;
  name: string;
  capacity: number;
  monthly_price: number;
  available_beds: number;
  total_beds: number;
  amenities: string[];
}

export interface PublicSettings {
  demo_mode?: boolean;
  hero_image_url?: string;
  room_image_urls?: string;
  hostel_name?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  facilities?: string[];
  booking_policy?: string;
  refund_policy?: string;
  payment_instructions?: string;
}

export function usePublicRooms() {
  return useQuery({
    queryKey: ["public", "rooms"],
    queryFn: () => api<{ items: PublicRoom[]; total: number }>("/public/rooms"),
    staleTime: 30_000,
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ["public", "settings"],
    queryFn: () => api<PublicSettings>("/public/settings"),
    staleTime: 60_000,
  });
}
