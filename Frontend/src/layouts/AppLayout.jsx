import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function AppLayout({ title, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      <div className="min-w-0 flex-1 flex flex-col">
        <Header title={title} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;