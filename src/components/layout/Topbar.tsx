import { TourTrigger } from "./TourTrigger";

export function Topbar() {
  return (
    <header role="banner" className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <h1 className="pl-8 text-base font-semibold text-gray-900 sm:text-lg lg:pl-0">
        Outside Counsel Platform
      </h1>
      <div className="flex items-center gap-3">
        <TourTrigger />
        <span className="text-xs text-gray-400">SCG Legal</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-scg-600 text-sm font-medium text-white">
          S
        </div>
      </div>
    </header>
  );
}
