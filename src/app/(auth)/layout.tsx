export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Nossa Lista</h1>
          <p className="text-gray-500 mt-1 text-sm">Lista de compras do casal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
