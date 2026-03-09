import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Wallet,
  Link2,
  Users,
  Shield,
  UserCircle,
  TrendingUp,
  LogOut,
  ChevronLeft,
  BarChart3,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AppSidebarProps {
  userRole?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Trades", url: "/trades", icon: Activity },
  { title: "Wallet", url: "/wallet", icon: Wallet },
  { title: "MT5 Accounts", url: "/mt5-accounts", icon: Link2 },
  { title: "Copy Trading", url: "/copy-trading", icon: Users },
  { title: "Security", url: "/security", icon: Shield },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

const adminItems = [
  { title: "Admin Panel", url: "/admin", icon: ShieldCheck },
];

export function AppSidebar({ userRole, collapsed = false, onToggle }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been successfully signed out." });
    navigate("/auth");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out",
        "bg-card border-r border-border/60",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-border/60 px-4 flex-shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 glow-primary-sm">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gradient">TradePro</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg hover:bg-muted/70 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {collapsed && (
          <button
            onClick={onToggle}
            className="w-full flex justify-center p-2.5 mb-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        )}

        <div className={cn(!collapsed && "mb-1 px-2")}>
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Main Menu
            </span>
          )}
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/dashboard"}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-muted/70",
              collapsed && "justify-center px-2.5"
            )}
            activeClassName="bg-primary/12 text-primary border border-primary/20 shadow-sm"
          >
            <item.icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {userRole === "admin" && (
          <>
            <div className={cn("pt-3 pb-1", !collapsed && "px-2")}>
              {!collapsed && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Administration
                </span>
              )}
              {collapsed && <div className="h-px w-full bg-border/60 my-2" />}
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "text-muted-foreground hover:text-warning hover:bg-warning/10",
                  collapsed && "justify-center px-2.5"
                )}
                activeClassName="bg-warning/12 text-warning border border-warning/20"
              >
                <item.icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom Logout */}
      <div className="p-2 border-t border-border/60">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium w-full transition-all duration-200",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2.5"
          )}
        >
          <LogOut className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
