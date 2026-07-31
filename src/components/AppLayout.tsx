import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, History, LogOut, Wallet,
  FileBarChart, Package, Bot, Users, Box, ChefHat, DollarSign, Sparkles,
  ChevronDown, Menu, Sun, Moon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
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

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <img src="/logo.jpg" alt="Casegosto" className="h-8 w-8 rounded-lg object-cover" />
      </div>
      <span className="font-heading text-xl font-bold text-[var(--color-text-primary)] tracking-[1.5px]">
        CASEGOSTO
      </span>
    </div>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  const homeActive = pathname === "/";
  return (
    <div className="hidden md:flex gap-1 px-4">
      <NavLink
        to={home.to}
        className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium uppercase tracking-[0.8px] border-b-2 transition-all duration-200 ${
          homeActive
            ? "border-[var(--color-accent)] text-[var(--color-accent)]"
            : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
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
                className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium uppercase tracking-[0.8px] border-b-2 transition-all duration-200 outline-none ${
                  active
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
                }`}
              >
                <group.icon className="h-4 w-4" />
                {group.label}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px] p-1.5 border-[var(--color-border)] bg-[var(--color-surface)]">
              {group.items.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="rounded-md text-[var(--color-text-secondary)] focus:bg-[var(--color-accent-muted)] focus:text-[var(--color-accent)]">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 cursor-pointer ${isActive ? "text-[var(--color-accent)] font-semibold" : ""}`
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
          <Button variant="ghost" size="sm" className="gap-2 text-[var(--color-text-secondary)]">
            <Menu className="h-5 w-5" />
            <span className="font-heading uppercase tracking-wider text-[13px]">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="border-b border-[var(--color-border)] px-4 py-5">
            <Brand />
          </div>
          <nav className="p-3 space-y-4 overflow-y-auto">
            <NavLink
              to={home.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/" ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <home.icon className="h-4 w-4" />
              {home.label}
            </NavLink>

            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
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
                          isActive ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
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
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)] shadow-[0_1px_8px_rgba(90,60,20,0.08)]">
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <Brand />
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-secondary)] hidden sm:inline font-medium">{user?.email}</span>
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Tema claro" : "Tema escuro"}
                aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
                className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-accent)] transition-colors duration-200"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sair"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-transparent transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="border-t border-[var(--color-border)]">
            <DesktopNav pathname={location.pathname} />
            <MobileNav pathname={location.pathname} />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-5 sm:py-8 animate-fade-in max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
