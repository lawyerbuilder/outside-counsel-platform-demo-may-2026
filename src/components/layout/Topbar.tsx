import { TourTrigger } from "./TourTrigger";
import { RoleSwitcher } from "./RoleSwitcher";
import type { DemoRole } from "@/server/demo-role";

export function Topbar({ role }: { role: DemoRole }) {
  return (
    <header
      role="banner"
      className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm sm:px-6"
    >
      <h1 className="pl-8 text-sm font-semibold tracking-tight text-foreground sm:text-base lg:pl-0">
        Outside Counsel Platform
      </h1>
      <div className="flex items-center gap-2.5">
        <RoleSwitcher current={role} />
        <TourTrigger />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-scg-600 text-sm font-semibold text-white ring-2 ring-scg-100">
            {role === "LAWYER" ? "S" : role === "MANAGER" ? "P" : "A"}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-medium text-foreground">
              {role === "LAWYER" ? "Sarah Scales" : role === "MANAGER" ? "Pranee C." : "Admin"}
            </p>
            <p className="text-[10px] text-muted-foreground">SCG Legal</p>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-scg-600 text-sm font-semibold text-white sm:hidden">
          {role === "LAWYER" ? "S" : role === "MANAGER" ? "P" : "A"}
        </div>
      </div>
    </header>
  );
}
