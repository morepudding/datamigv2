export default function DebugPage() {
  return (
    <html>
      <head>
        <title>Debug - PLM Migration Tool</title>
      </head>
      <body>
        <h1 style={{color: 'red', fontSize: '48px'}}>🚨 DEBUG MODE - ÇA MARCHE !</h1>
        <p>Si vous voyez cette page, Vercel fonctionne correctement !</p>
        <div>
          <strong>Timestamp:</strong> {new Date().toISOString()}
        </div>
        <div>
          <strong>Environment:</strong> {process.env.NODE_ENV}
        </div>
      </body>
    </html>
  );
}
