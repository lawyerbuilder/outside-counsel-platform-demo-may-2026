export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-end justify-between">
        <div>
          <div className="h-7 w-48 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-28 rounded-md bg-gray-200" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="h-5 w-5 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
            <div className="mt-1 h-3 w-24 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 flex-1 rounded bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
