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
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { getCurrentUser, logout } from "../api/auth";

const NAV_BY_ROLE = {
  owner: [
    { to: "/owner-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sales", label: "Sales", icon: Receipt },
    { to: "/products", label: "Products", icon: Package },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/pos", label: "POS", icon: ShoppingCart },
    { to: "/users", label: "Users", icon: Users },
    { to: "/shops", label: "Shops", icon: Store },
  ],
  manager: [
    { to: "/manager-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sales", label: "Sales", icon: Receipt },
    { to: "/products", label: "Products", icon: Package },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/pos", label: "POS", icon: ShoppingCart },
  ],
  cashier: [
    { to: "/pos", label: "POS", icon: ShoppingCart },
    { to: "/sales", label: "Sales", icon: Receipt },
  ],
};

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const user = getCurrentUser();
  const links = NAV_BY_ROLE[user?.role] || [];

  return (
    <aside
      className={`h-screen shrink-0 overflow-y-auto bg-primary flex flex-col py-6 transition-all duration-200 ${
        collapsed ? "w-20 px-2" : "w-55 px-4"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center mb-8 ${collapsed ? "justify-center" : "justify-between px-2"}`}>
        {!collapsed && (
          <div>
            <p className="text-white text-lg font-semibold">EXOTIC</p>
            <p className="text-slate-400 text-xs tracking-[0.2em]">COLLECTIONS</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-3 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              title={collapsed ? link.label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-white text-primary shadow-[0_4px_14px_rgba(0,0,0,0.12)] before:absolute before:left-0 before:top-2 before:h-6 before:w-1 before:rounded-r-full before:bg-accent"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={collapsed ? 23 : 18} strokeWidth={collapsed ? 2 : 1.8} />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        title={collapsed ? "Log out" : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut size={collapsed ? 23 : 18} strokeWidth={collapsed ? 2 : 1.8} />
        {!collapsed && <span>Log out</span>}
      </button>
    </aside>
  );
}

export default Sidebar;