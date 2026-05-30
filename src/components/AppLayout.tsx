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
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium font-heading border-b-2 transition-colors ${
          homeActive
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium font-heading border-b-2 transition-colors outline-none ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <group.icon className="h-4 w-4" />
                {group.label}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              {group.items.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
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
          <div className="gradient-warm px-4 py-4">
            <p className="text-primary-foreground font-heading font-bold text-lg">🍱 CASEGOSTO</p>
          </div>
          <nav className="p-3 space-y-4 overflow-y-auto">
            <NavLink
              to={home.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
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
                        `flex items-center gap-2 px-3 py-2 ml-2 rounded-md text-sm font-medium ${
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
      <header className="gradient-warm px-3 sm:px-6 py-3 sm:py-4 shadow-warm-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍱</span>
            <h1 className="text-2xl font-extrabold font-heading text-primary-foreground tracking-tight">
              CASEGOSTO
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-primary-foreground/80 hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="text-primary-foreground hover:bg-white/20">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-card">
        <div className="container mx-auto">
          <DesktopNav pathname={location.pathname} />
          <MobileNav pathname={location.pathname} />
        </div>
      </nav>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-fade-in max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
