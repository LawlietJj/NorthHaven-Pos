import { Menu } from "lucide-react";
import { getCurrentUser } from "../api/auth";

const ROLE_LABELS = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Header({ title, onOpenMobileNav }) {
  const user = getCurrentUser();

  return (
    <header className="h-16 bg-bg flex items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => onOpenMobileNav?.()}
          className="-ml-2 shrink-0 rounded-lg p-2 text-primary transition hover:bg-black/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="truncate text-lg font-semibold text-primary">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-primary leading-tight">{user?.name}</p>
          <p className="text-xs text-text-secondary leading-tight">{ROLE_LABELS[user?.role]}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-semibold">
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}

export default Header;