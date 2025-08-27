export default function DiagnosticPage() {
  return (
    <div style={{ 
      fontFamily: 'monospace', 
      padding: '20px', 
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: 'red', fontSize: '36px' }}>🔥 DIAGNOSTIC VERCEL 404</h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        margin: '20px 0',
        border: '2px solid red',
        borderRadius: '10px'
      }}>
        <h2>✅ Cette page fonctionne = Vercel fonctionne !</h2>
        <p><strong>URL actuelle:</strong> /diagnostic</p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      </div>

      <div style={{ 
        backgroundColor: '#ffe6e6', 
        padding: '15px', 
        margin: '20px 0',
        border: '2px solid #ff0000',
        borderRadius: '10px'
      }}>
        <h2>🔍 Test des routes :</h2>
        <ul>
          <li><a href="/" style={{color: 'blue'}}>/ (page principale)</a> - Devrait fonctionner</li>
          <li><a href="/test" style={{color: 'blue'}}>/test</a> - Page de test simple</li>
          <li><a href="/debug" style={{color: 'blue'}}>/debug</a> - Page de debug HTML</li>
          <li><a href="/diagnostic" style={{color: 'blue'}}>/diagnostic</a> - Cette page</li>
        </ul>
      </div>

      <div style={{ 
        backgroundColor: '#e6ffe6', 
        padding: '15px', 
        margin: '20px 0',
        border: '2px solid #00ff00',
        borderRadius: '10px'
      }}>
        <h2>🎯 Solution si cette page fonctionne :</h2>
        <p>Le problème n'est PAS Vercel, mais probablement :</p>
        <ul>
          <li>❓ URL incorrecte testée</li>
          <li>❓ Cache navigateur tenace</li>
          <li>❓ Problème de DNS/réseau</li>
          <li>❓ Mauvais domaine Vercel</li>
        </ul>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          body { margin: 0; }
          a:hover { text-decoration: underline; }
        `
      }} />
    </div>
  );
}
