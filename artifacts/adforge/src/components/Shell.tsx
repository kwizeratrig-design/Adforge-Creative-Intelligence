import { type ReactNode, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { useGetCurrentBrand } from "@workspace/api-client-react";
import { ChevronRight, Home, Layers3, Lightbulb, LogOut, Menu, Settings2, Sparkles, X, Zap, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";

type AnyRecord = Record<string, any>;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const lime = "text-[#d7f36b]";
const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
const navItems = [
  { href: "/workspace", label: "Overview", icon: Home },
  { href: "/brand-dna", label: "Brand DNA", icon: Lightbulb },
  { href: "/campaigns", label: "Campaigns", icon: Layers3 },
  { href: "/creative-lab", label: "Creative Lab", icon: Sparkles },
  { href: "/intelligence", label: "Intelligence", icon: BarChart3 },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const brandQ = useGetCurrentBrand();
  const brand = brandQ.data as AnyRecord | null | undefined;
  const brandName = brand?.name || "No brand yet";
  const brandSite = brand?.website ? String(brand.website).replace(/^https?:\/\//, "") : "Create Brand DNA to start";
  const active = (href: string) => (href === "/workspace" ? location === "/workspace" || location === "/" : location.startsWith(href.split("?")[0]));
  const handleSignOut = async () => {
    await signOut({ redirectUrl: basePath ? `${basePath}/sign-in` : "/sign-in" });
  };
  return (
    <div className="min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-[248px] border-r border-[#282b20] bg-[#141610]/95 px-5 py-6 backdrop-blur-xl transition-transform lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-2">
          <Link href="/workspace" className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#6e715e]">Workspace</div>
        <nav className="mt-3 space-y-1">{navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", active(href) ? "bg-[#d7f36b]/10 text-[#d7f36b]" : "text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]")}><Icon className="h-[17px] w-[17px]" /><span>{label}</span></Link>
        ))}</nav>
        <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#6e715e]">Manage</div>
        <nav className="mt-3 space-y-1"><Link href="/settings" className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", location.startsWith("/settings") ? "bg-[#d7f36b]/10 text-[#d7f36b]" : "text-[#949684] hover:bg-[#292c20]")}><Settings2 className="h-[17px] w-[17px]" /><span>Settings</span></Link></nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className={cn("h-2 w-2 rounded-full", brand ? "bg-[#d7f36b]" : "bg-[#555]")} /></div>
          <p className="mt-2 truncate text-sm font-semibold">{brandName}</p>
          <p className="mt-1 truncate text-xs text-[#777a69]">{brandSite}</p>
          <Link href="/brand-dna" className="mt-3 flex items-center gap-1 text-xs font-medium text-[#d7f36b]">{brand ? "Edit brand brain" : "Create brand"} <ChevronRight className="h-3 w-3" /></Link>
        </div>
      </aside>
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#24271d] bg-[#10110d]/85 px-5 backdrop-blur-xl lg:px-10">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="hidden items-center gap-2 text-xs text-[#777a69] lg:flex"><span className="font-mono-ui uppercase tracking-[.18em]">{brandName} / workspace</span></div>
          <div className="ml-auto flex items-center gap-3 text-xs text-[#777a69]">
            <span className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</span>
            {user?.primaryEmailAddress?.emailAddress && (
              <span className="hidden max-w-[160px] truncate md:inline">{user.primaryEmailAddress.emailAddress}</span>
            )}
            <button type="button" onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-full border border-[#3a3d2b] px-3 py-1.5 text-xs text-[#c8cbb4] transition hover:border-[#d7f36b]/40 hover:text-[#d7f36b]" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-72px)] px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
