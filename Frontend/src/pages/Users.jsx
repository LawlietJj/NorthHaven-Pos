import { useEffect, useState } from "react";
import { Pencil, UserX, UserCheck, KeyRound } from "lucide-react";
import { listUsers, createUser, updateUser, deactivateUser, reactivateUser } from "../api/users";
import LoadingScreen from "../components/LoadingScreen";
import ResetPasswordModal from "../components/ResetPasswordModal";
import { useToast } from "../components/ToastProvider";

const PAGE_SIZE = 10;

function Users() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null); // null = adding new
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "cashier" });
  const [resettingUser, setResettingUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  function refresh() {
    listUsers({ page, limit: PAGE_SIZE })
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [page]);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(user) {
    setEditingId(user.user_id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "cashier" });
  }

  async function handleSubmit() {
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await updateUser(editingId, { name: form.name, email: form.email });
        showToast("Staff member updated.");
      } else {
        await createUser(form);
        showToast("Staff member added.");
      }
      cancelEdit();
      refresh();
    } catch (err) {
      const message = err.response?.data?.error || "Could not save user.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    try {
      if (user.is_active) await deactivateUser(user.user_id);
      else await reactivateUser(user.user_id);
      showToast(user.is_active ? "Staff member deactivated." : "Staff member reactivated.");
      refresh();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update staff status.", "error");
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      {/* Add / Edit form */}
      <div className="bg-surface rounded-xl p-5 shadow-sm space-y-4">
        <p className="text-sm font-medium text-slate-900">
          {editingId ? "Edit Staff Member" : "Add Staff Member"}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
            />
          </div>
          {!editingId && (
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Role *</label>
            <select
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              disabled={!!editingId}
              className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none disabled:bg-bg"
            >
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {editingId && (
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-border text-sm">
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Update Staff" : "Add Staff"}
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-surface rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-slate-900">{u.name}</td>
                <td className="px-5 py-3 text-text-secondary">{u.email}</td>
                <td className="px-5 py-3 text-text-secondary capitalize">{u.role}</td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setResettingUser(u)}
                      className="text-text-secondary hover:text-accent"
                      title="Reset Password"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button onClick={() => startEdit(u)} className="text-text-secondary hover:text-accent">
                      <Pencil size={16} />
                    </button>
                    {u.role !== "owner" && (
                      <button
                        onClick={() => toggleActive(u)}
                        className="text-text-secondary hover:text-accent"
                        title={u.is_active ? "Deactivate" : "Reactivate"}
                      >
                        {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-text-muted">
                  No staff members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            Showing {users.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} of {total} staff members
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {resettingUser && (
        <ResetPasswordModal
          userId={resettingUser.user_id}
          userName={resettingUser.name}
          onClose={() => setResettingUser(null)}
          onSuccess={() => {
            setResettingUser(null);
            showToast("Password reset successfully.");
          }}
        />
      )}
    </div>
  );
}

export default Users;