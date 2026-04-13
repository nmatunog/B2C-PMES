import type { ReactNode } from "react";

export const metadata = {
  title: "B2C PMES API",
  description: "Edge API routes (Neon + Firebase)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
