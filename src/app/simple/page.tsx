export default function TestSimplePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', textAlign: 'center' }}>
      <h1 style={{ color: 'green', fontSize: '48px' }}>✅ ÇA MARCHE !</h1>
      <p style={{ fontSize: '24px' }}>Route Next.js App Router fonctionnelle sur Vercel</p>
      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: 'blue', fontSize: '18px' }}>← Retour à l'accueil</a>
      </div>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px' }}>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
        <p><strong>Route:</strong> /simple</p>
        <p><strong>Status:</strong> SUCCESS ✅</p>
      </div>
    </div>
  );
}
