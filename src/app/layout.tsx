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
  // Logs de debug pour Vercel
  console.log('🏠 RootLayout - Chargement réussi');
  console.log('📦 Children reçus:', !!children);
  
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('🌟 Application PLM Migration chargée avec succès !');
              console.log('🔗 URL:', window.location.href);
              console.log('⏰ Timestamp:', new Date().toISOString());
            `
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
