"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import LogoutIcon from "@mui/icons-material/Logout";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import MenuIcon from "@mui/icons-material/Menu";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import IconButton from "@mui/material/IconButton";

interface DashboardShellProps {
  user: { name?: string | null; email: string };
  children: ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: SpaceDashboardIcon },
  { href: "/dashboard/resume", label: "Resume builder", icon: DescriptionIcon },
  { href: "/dashboard/resumes", label: "My resumes", icon: FolderOpenIcon },
  { href: "/dashboard/job-match", label: "Job match", icon: TravelExploreIcon },
  { href: "/dashboard/cv-check", label: "CV check", icon: FactCheckIcon },
  { href: "/dashboard/cover-letters", label: "Cover letters", icon: MailOutlineIcon },
  { href: "/dashboard/applications", label: "Applications", icon: AssignmentIcon },
  { href: "/dashboard/interview", label: "Interview prep", icon: QuestionAnswerIcon },
  { href: "/dashboard/profile", label: "Profile & sharing", icon: PersonOutlineIcon },
];

const COLLAPSE_KEY = "sidebar-collapsed";
const COLLAPSE_EVENT = "sidebar-collapsed-change";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSE_EVENT, callback);
  };
}

function readCollapsed(): string {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) ?? "";
  } catch {
    return "";
  }
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // "1" collapsed, "0" expanded, "" no choice yet. Until the user chooses, the
  // resume builder starts collapsed so the editor and preview get the room.
  const stored = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => "");
  const collapsed =
    stored === "1" || (stored === "" && pathname.startsWith("/dashboard/resume"));
  const toggleCollapsed = () => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {
      /* the choice just will not be remembered */
    }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };
  const initials = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  const renderNavigation = (compact: boolean) => (
    <nav className={`flex flex-1 flex-col gap-1 ${compact ? "px-2" : "px-3"}`}>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            title={compact ? item.label : undefined}
            aria-label={compact ? item.label : undefined}
            className={`flex items-center rounded-lg py-2 text-sm font-medium transition ${
              compact ? "justify-center px-2" : "gap-2.5 px-3"
            } ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon fontSize="small" />
            {!compact && item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar: full width, or a slim icon rail to leave room for the editor */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div
          className={`flex items-center py-5 ${
            collapsed ? "flex-col gap-3 px-2" : "justify-between gap-2.5 px-5"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-base font-bold text-white">
              R
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">Resume Studio</p>
                <p className="text-xs text-slate-500">Career workspace</p>
              </div>
            )}
          </div>
          <IconButton
            size="small"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronRightIcon fontSize="small" />
            ) : (
              <ChevronLeftIcon fontSize="small" />
            )}
          </IconButton>
        </div>
        {renderNavigation(collapsed)}
        <div className="border-t border-slate-200 p-3">
          <div
            className={`flex items-center rounded-lg py-2 ${
              collapsed ? "flex-col gap-2" : "gap-2.5 px-2"
            }`}
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
              title={collapsed ? user.email : undefined}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.name || "Signed in"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            )}
            <IconButton
              size="small"
              aria-label="Sign out"
              onClick={() => void signOut({ redirectTo: "/login" })}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
        <IconButton aria-label="Open menu" onClick={() => setOpen(true)}>
          <MenuIcon />
        </IconButton>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            R
          </div>
          <p className="text-sm font-semibold text-slate-900">Resume Studio</p>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">Menu</p>
              <IconButton aria-label="Close menu" onClick={() => setOpen(false)}>
                <CloseIcon />
              </IconButton>
            </div>
            {renderNavigation(false)}
            <div className="border-t border-slate-200 p-4">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.name || "Signed in"}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <button
                type="button"
                onClick={() => void signOut({ redirectTo: "/login" })}
                className="mt-3 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogoutIcon fontSize="small" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        {children}
      </main>
    </div>
  );
}

export default DashboardShell;
