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

function Header({ title }) {
  const user = getCurrentUser();

  return (
    <header className="h-16 bg-bg flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-primary">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="text-right">
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