export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm surface p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-scg-600">
          <span className="text-xs font-bold text-white">SCG</span>
        </div>
        <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Outside Counsel Platform
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Sign in to access the SCG Legal outside counsel platform
        </p>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
          />
          <button className="w-full rounded-md bg-scg-700 px-3 py-2 text-sm font-medium text-white hover:bg-scg-800">
            Sign in with magic link
          </button>
        </div>
      </div>
    </div>
  );
}
