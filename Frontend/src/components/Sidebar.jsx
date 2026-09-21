import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Tags,
  ShoppingCart,
  Users,
  Store,
  Boxes,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { getCurrentUser, logout } from "../api/auth";
import logo from "../assets/logo.jpeg";

const NAV_BY_ROLE = {
  owner: [
    { to: "/owner-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sales", label: "Sales", icon: Receipt },
    { to: "/products", label: "Products", icon: Package },
    { to: "/stock", label: "Stock", icon: Boxes },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/pos", label: "POS", icon: ShoppingCart },
    { to: "/users", label: "Users", icon: Users },
    { to: "/shops", label: "Shops", icon: Store },
  ],
  manager: [
    { to: "/manager-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sales", label: "Sales", icon: Receipt },
    { to: "/products", label: "Products", icon: Package },
    { to: "/stock", label: "Stock", icon: Boxes },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/pos", label: "POS", icon: ShoppingCart },
  ],
  cashier: [
    { to: "/pos", label: "POS", icon: ShoppingCart },
    { to: "/sales", label: "Sales", icon: Receipt },
  ],
};

function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);
  const user = getCurrentUser();
  const links = NAV_BY_ROLE[user?.role] || [];
  // On mobile the drawer is either fully hidden or fully shown — the
  // icon-only "collapsed" mode only makes sense for the always-visible
  // desktop sidebar, so mobile ignores it and always shows full labels.
  const showLabels = !collapsed || mobileOpen;

  return (
    <>
      {/* Backdrop — mobile only, closes the drawer on tap */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => onCloseMobile?.()} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-60 shrink-0 overflow-y-auto bg-primary flex flex-col py-6 px-4 transition-transform duration-200 lg:static lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-20 lg:px-2" : "lg:w-60 lg:px-4"}`}
      >
        {/* Logo + collapse/close toggle */}
        <div className={`flex items-center mb-8 justify-between ${collapsed ? "lg:justify-center" : "px-2"}`}>
          <img
            src={logo}
            alt="Exotic Collections logo"
            className={`${collapsed ? "lg:h-10 lg:w-10" : ""} h-9 w-9 rounded-full object-cover`}
          />
          {showLabels && (
            <div className="flex-1 ml-3">
              <p className="text-white text-lg font-semibold">EXOTIC</p>
              <p className="text-slate-400 text-xs tracking-[0.2em]">COLLECTIONS</p>
            </div>
          )}
          {/* Mobile: close button */}
          <button
            onClick={() => onCloseMobile?.()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          {/* Desktop: collapse/expand toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => onCloseMobile?.()}
                title={!showLabels ? link.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    collapsed ? "lg:justify-center" : ""
                  } ${
                    isActive
                      ? "bg-white text-primary shadow-[0_4px_14px_rgba(0,0,0,0.12)] before:absolute before:left-0 before:top-2 before:h-6 before:w-1 before:rounded-r-full before:bg-accent"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={collapsed ? 23 : 18} strokeWidth={collapsed ? 2 : 1.8} />
                {showLabels && <span>{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          title={!showLabels ? "Log out" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition ${
            collapsed ? "lg:justify-center" : ""
          }`}
        >
          <LogOut size={collapsed ? 23 : 18} strokeWidth={collapsed ? 2 : 1.8} />
          {showLabels && <span>Log out</span>}
        </button>
      </aside>
    </>
  );
}

export default Sidebar;