import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ApiKeyProvider } from "@/components/ApiKeyProvider";
import { ProductTour } from "@/components/onboarding/ProductTour";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiKeyProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
      <ProductTour />
    </ApiKeyProvider>
  );
}
