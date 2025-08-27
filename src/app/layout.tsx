import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLM to IFS Data Migration Tool",
  description: "Migration tool for PLM to IFS data transformation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
