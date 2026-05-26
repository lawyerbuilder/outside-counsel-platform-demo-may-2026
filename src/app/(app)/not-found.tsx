import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-scg-50">
          <FileQuestion className="h-8 w-8 text-scg-600" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Page not found
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/directory"
          className="inline-flex rounded-md bg-scg-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-scg-700"
        >
          Go to Directory
        </Link>
      </div>
    </div>
  );
}
