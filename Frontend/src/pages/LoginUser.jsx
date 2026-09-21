import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../api/auth";
import logo from "../assets/logo.jpeg";
import { useToast } from "../components/ToastProvider";

function LoginUser() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter your email and password.");
      showToast("Enter your email and password.", "error");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);

      // Route based on role — Cashier goes straight to POS,
      // Manager/Owner land on their dashboard.
      if (user.role === "cashier") {
        navigate("/pos");
      } 
      if (user.role === "manager" ) {
        navigate("/manager-dashboard");
      }else if (user.role === "owner") {
        navigate("/owner-dashboard");
      }
    } catch (err) {
      const message = err.response?.data?.error || "Something went wrong. Try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* LEFT PANEL */}
      <section className="hidden lg:flex lg:w-[42%] min-h-screen bg-primary flex-col">
        <div className="flex-1 px-12 py-12 flex flex-col justify-center">
          <div className="max-w-md">
            <img src={logo} alt="Exotic Collections logo" className="w-12 h-12 rounded-xl object-cover mb-6" />
            <p className="text-white text-2xl font-semibold tracking-tight">EXOTIC</p>
            <p className="text-slate-300 text-sm tracking-[0.25em] mt-1">COLLECTIONS</p>
            <div className="w-10 h-px bg-accent mt-8 mb-6" />
            <h1 className="text-3xl xl:text-4xl font-semibold text-white leading-tight">
              Manage your business
              <br />
              with confidence.
            </h1>
            <p className="text-slate-400 mt-5 max-w-sm leading-relaxed">
              A smarter way to manage sales, inventory, customers, and your stores from one place.
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT PANEL */}
      <main className="flex-1 min-h-screen bg-bg flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <img src={logo} alt="Exotic Collections logo" className="w-11 h-11 rounded-xl object-cover mb-4" />
            <p className="text-xl font-semibold text-primary">EXOTIC</p>
            <p className="text-xs tracking-[0.25em] text-slate-500 mt-1">COLLECTIONS</p>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-2">Sign in to your EXOTIC account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email or Username
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                autoComplete="username"
                className="w-full h-12 px-4 rounded-xl border border-border bg-surface text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-surface text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-semibold transition shadow-sm focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-center text-xs text-slate-400">EXOTIC Collections POS</p>
            <p className="text-center text-[11px] text-slate-300 mt-1">Secure business management</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginUser;