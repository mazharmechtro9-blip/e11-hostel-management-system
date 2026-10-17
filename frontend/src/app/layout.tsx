import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "E-11 Hostel | Safe Stay. Better Tomorrow.",
    template: "%s · E-11 Hostel",
  },
  description:
    "A better place to live and a smarter way to manage. E-11 Hostel student living and management portal in Islamabad.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
