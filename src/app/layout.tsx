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
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('🌟 Application PLM Migration chargée avec succès !');
              console.log('🔗 URL:', window.location.href);
              console.log('⏰ Timestamp:', new Date().toISOString());
              console.log('📱 User Agent:', navigator.userAgent);
            `
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <div id="__next">
          {children}
        </div>
      </body>
    </html>
  );
}
