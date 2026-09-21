import { useState } from "react";
import Modal from "./Modal";
import { resetPassword } from "../api/users";

function ResetPasswordModal({ userId, userName, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setSaving(true);
    try {
      await resetPassword(userId, newPassword);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Could not reset password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Reset Password — ${userName}`} onClose={onClose}>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <label className="block text-xs text-text-secondary mb-1.5">New Password</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        className="w-full h-10 px-3 mb-4 rounded-lg border border-border text-sm outline-none focus:border-accent"
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Reset Password"}
        </button>
      </div>
    </Modal>
  );
}

export default ResetPasswordModal;
