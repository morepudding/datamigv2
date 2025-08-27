export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Test Page - PLM Migration Tool
        </h1>
        <p className="text-gray-600">
          Cette page de test fonctionne sur Vercel !
        </p>
        <div className="mt-6 space-y-2">
          <p className="text-sm text-gray-500">Build: SUCCESS</p>
          <p className="text-sm text-gray-500">Deployment: ACTIVE</p>
          <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
