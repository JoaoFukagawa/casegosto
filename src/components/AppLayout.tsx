import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, History, LogOut, Wallet,
  FileBarChart, Package, Bot, Users, Box, ChefHat, DollarSign, Sparkles,
  ChevronDown, Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: any };
type NavGroup = { label: string; icon: any; items: NavItem[] };

const home: NavItem = { to: "/", label: "Painel", icon: LayoutDashboard };

const groups: NavGroup[] = [
  {
    label: "Operacional",
    icon: Box,
    items: [
      { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/estoque", label: "Estoque", icon: Package },
      { to: "/historico", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Cardápio",
    icon: ChefHat,
    items: [
      { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
      { to: "/prato-do-dia", label: "Prato do Dia", icon: Sparkles },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    items: [
      { to: "/financeiro", label: "Financeiro", icon: Wallet },
      { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
    ],
  },
  {
    label: "IA",
    icon: Bot,
    items: [
      { to: "/assistente", label: "Assistente IA", icon: Bot },
    ],
  },
];

function isGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((i) => i.to === pathname);
}

function DesktopNav({ pathname }: { pathname: string }) {
  const homeActive = pathname === "/";
  return (
    <div className="hidden md:flex gap-1 px-4">
      <NavLink
        to={home.to}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium font-heading border-b-2 transition-all duration-200 ${
          homeActive
            ? "border-primary text-primary bg-primary/5"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
        }`}
      >
        <home.icon className="h-4 w-4" />
        {home.label}
      </NavLink>

      {groups.map((group) => {
        const active = isGroupActive(group, pathname);
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium font-heading border-b-2 transition-all duration-200 outline-none ${
                  active
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <group.icon className="h-4 w-4" />
                {group.label}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px] p-1.5">
              {group.items.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="rounded-md">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 cursor-pointer ${isActive ? "text-primary font-semibold" : ""}`
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden px-3 py-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Menu className="h-5 w-5" />
            <span className="font-heading">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="bg-[hsl(28,30%,16%)] px-4 py-5">
            <img src="/logo.jpg" alt="Casegosto" className="h-8 w-auto" />
          </div>
          <nav className="p-3 space-y-4 overflow-y-auto">
            <NavLink
              to={home.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <home.icon className="h-4 w-4" />
              {home.label}
            </NavLink>

            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  <group.icon className="h-3.5 w-3.5" />
                  {group.label}
                </div>
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 ml-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[hsl(28,30%,16%)] px-3 sm:px-6 py-2.5 sm:py-3 shadow-[0_4px_24px_-4px_hsl(28_30%_16%/0.4)]">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Casegosto" className="h-9 sm:h-10 w-auto rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[hsl(35,25%,70%)] hidden sm:inline font-medium">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="text-[hsl(35,25%,70%)] hover:text-[hsl(35,25%,88%)] hover:bg-white/10 transition-colors">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto">
          <DesktopNav pathname={location.pathname} />
          <MobileNav pathname={location.pathname} />
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-5 sm:py-8 animate-fade-in max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
