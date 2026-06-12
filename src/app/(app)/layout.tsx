import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { getDemoRole } from "@/server/demo-role";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const role = await getDemoRole();

  return (
    <>
      <div className="flex h-screen bg-background">
        <Sidebar role={role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar role={role} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
      <ProductTour />
    </>
  );
}
