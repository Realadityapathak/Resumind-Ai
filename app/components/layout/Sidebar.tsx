import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { usePuterStore } from "~/services/puter/store";
import Icon, { type IconName } from "~/components/ui/Icon";

interface SidebarProps {
  initialCollapsed?: boolean;
}

export default function Sidebar({ initialCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = usePuterStore();

  const username = auth.user?.username || "user";
  const userInitials = username.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
  };

  const navItems: { label: string; to: string; icon: IconName; badge?: string; active: boolean }[] = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: "grid",
      active: location.pathname === "/dashboard",
    },
    {
      label: "AI Workspace",
      to: "/workspace",
      icon: "sparkle",
      badge: "AI",
      active: location.pathname.startsWith("/workspace") || location.pathname.startsWith("/resume"),
    },
    {
      label: "Analyze Resume",
      to: "/upload",
      icon: "upload",
      active: location.pathname === "/upload",
    },
    {
      label: "Profile & Settings",
      to: "/profile",
      icon: "user",
      active: location.pathname === "/profile",
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between h-screen sticky top-0 bg-paper border-r border-rule transition-all duration-300 z-30 ${
        collapsed ? "w-20" : "w-64"
      }`}
      data-testid="sidebar-container"
    >
      <div>
        <div
          className={`flex items-center ${
            collapsed ? "flex-col gap-2 justify-center" : "justify-between"
          } p-4 border-b border-rule min-h-[65px]`}
        >
          {!collapsed ? (
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-ink tracking-[-0.045em]">RESUMIND</span>
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="w-8 h-8 rounded-[3px] bg-cobalt flex items-center justify-center text-paper font-semibold text-sm"
            >
              R
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-[3px] text-ink-4 hover:text-ink hover:bg-surface-2 cursor-pointer transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon
              name="panel-left"
              size={16}
              className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <nav className={`p-2.5 ${collapsed ? "space-y-2" : "space-y-1"}`}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-[3px] border-l-2 px-3 py-2.5 text-[13px] transition-colors ${
                collapsed ? "justify-center px-2" : ""
              } ${
                item.active
                  ? "bg-blue-50 text-blue-700 font-semibold border-cobalt"
                  : "text-ink-3 font-medium border-transparent hover:bg-surface-2 hover:text-ink"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={item.active ? "text-cobalt" : "text-ink-4"}>
                <Icon name={item.icon} size={18} />
              </span>
              {!collapsed && (
                <span className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold text-cobalt bg-cobalt-wash border border-blue-200 px-1.5 py-0.5 rounded-[2px]">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-rule">
        {!collapsed ? (
          <div className="p-3 rounded-[3px] bg-surface border border-rule flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[12px] font-semibold text-ink-2">Puter Cloud</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule">
              <span className="text-[11px] text-ink-3 truncate max-w-[120px]">@{username}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] text-ink-3 hover:text-red-600 cursor-pointer font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="relative flex h-2 w-2" title="Puter Cloud Online">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div
              className="w-8 h-8 rounded-full bg-cobalt text-paper flex items-center justify-center font-semibold text-[10px]"
              title={`@${username}`}
            >
              {userInitials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-ink-4 hover:text-red-600 rounded-[3px] cursor-pointer transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
