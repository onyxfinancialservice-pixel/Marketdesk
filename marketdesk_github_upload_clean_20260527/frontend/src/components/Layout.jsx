import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LineChart,
  Bookmark,
  BellRing,
  History,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/markets", label: "Markets", icon: LineChart, testid: "nav-markets" },
  { to: "/watchlists", label: "Watchlists", icon: Bookmark, testid: "nav-watchlists" },
  { to: "/alerts", label: "Alerts", icon: BellRing, testid: "nav-alerts" },
  { to: "/history", label: "AI History", icon: History, testid: "nav-history" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      <aside className="fixed top-0 left-0 bottom-0 w-64 border-r border-zinc-200 bg-white z-40 flex flex-col">
        <div className="px-6 py-6 border-b border-zinc-200">
          <Link to="/" className="flex items-center gap-2.5" data-testid="brand-link">
            <div className="w-8 h-8 rounded-md bg-zinc-950 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="font-heading text-base font-extrabold tracking-tight text-zinc-950 leading-none">
                MarketDesk
              </div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 mt-1">
                AI Trading
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`
              }
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-zinc-200">
          <div className="px-3 py-2 mb-2">
            <div className="text-[11px] tracking-[0.1em] uppercase text-zinc-400 font-semibold">
              Signed in as
            </div>
            <div className="text-xs text-zinc-700 mt-0.5 truncate" data-testid="user-email">
              {user?.email}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            data-testid="sign-out-btn"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
