import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function AppLayout({ title, children }) {
  return (
    <div className="flex h-screen overflow-hidden overflow-x-hidden bg-bg">
      <Sidebar />

      <div className="min-w-0 flex-1 flex flex-col">
        <Header title={title} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;