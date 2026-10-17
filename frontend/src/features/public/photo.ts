import type { PublicSettings } from "./public-data";
export function roomPhoto(capacity: number, settings?: PublicSettings) {
  const custom =
    settings?.room_image_urls
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean) || [];
  return (
    custom[capacity - 2] ||
    `/photos/room-${Math.min(6, Math.max(2, capacity))}.jpg`
  );
}
