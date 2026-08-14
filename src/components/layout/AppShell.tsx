import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  CircleDollarSign,
  Loader2,
  Tag,
  Unlock,
  EyeOff,
  Newspaper,
  BarChart3,
  Mail,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getAccessToken } from "@/lib/api/client";
import { useVisibility } from "@/lib/visibility-context";
import { PasswordDialog } from "@/components/ui/password-dialog";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
};

const nav: NavItem[] = [
  { to: "/dashboard", label: "Panel", icon: LayoutDashboard, exact: true },
  { to: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { to: "/reports", label: "Reportes", icon: BarChart3 },
  { to: "/wealth", label: "Patrimonio", icon: Wallet },
  { to: "/goals", label: "Metas", icon: Target },
  { to: "/categories", label: "Categorías", icon: Tag },
  { to: "/intelligence", label: "Inteligencia & Impuestos", icon: Sparkles },
  { to: "/news", label: "Noticias", icon: Newspaper },
  { to: "/emails", label: "Emails", icon: Mail },
  { to: "/admin", label: "Usuarios", icon: Users, adminOnly: true },
  { to: "/settings", label: "Configuración", icon: Settings },
];

function VisibilityToggle({ className }: { className?: string }) {
  const { mode, setMasked, setEncrypted, setVisible } = useVisibility();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (mode === "visible") {
      setPwdOpen(true);
    } else {
      setVisible();
    }
  }

  async function handlePasswordSubmit(password: string) {
    setLoading(true);
    try {
      setEncrypted(password);
      setPwdOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out",
          mode === "visible"
            ? "text-muted-foreground hover:bg-surface hover:text-foreground"
            : "bg-warning/15 text-warning hover:bg-warning/25",
          className,
        )}
        title={mode === "visible" ? "Cifrar datos financieros" : "Mostrar datos financieros"}
      >
        {mode === "visible" ? (
          <>
            <EyeOff className="h-4 w-4" />
            <span className="hidden lg:inline">Cifrar</span>
          </>
        ) : (
          <>
            <Unlock className="h-4 w-4" />
            <span className="hidden lg:inline">Descifrar</span>
          </>
        )}
      </button>

      <PasswordDialog
        open={pwdOpen}
        onOpenChange={setPwdOpen}
        onSubmit={handlePasswordSubmit}
        mode="encrypt"
        loading={loading}
      />
    </>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const name = user?.username ? user.username : "Usuario Cost Manager";
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : "CM";
  const visibleNav = nav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <CircleDollarSign className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight">Cost Manager</p>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleNav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-200 ease-out-soft hover:translate-x-0.5",
                active
                  ? "bg-surface-2 text-foreground shadow-elegant"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
                size={18}
              />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-1">
        <VisibilityToggle className="w-full justify-center" />
      </div>

      <div className="m-3 rounded-2xl border border-border bg-surface/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="mt-3 w-full justify-center gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !getAccessToken()) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && requireAdmin && !isAdmin) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, isAuthenticated, requireAdmin, isAdmin, navigate]);

  if (isLoading || !isAuthenticated || (requireAdmin && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-background/80 backdrop-blur-xl lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 border-r border-border bg-background">
          <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display text-base font-semibold">Cost Manager</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <VisibilityToggle />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
