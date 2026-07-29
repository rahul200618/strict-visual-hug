import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { login, type Role } from "@/lib/mock/store";
import { Building2, ShieldCheck, ArrowRight, Lock, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/app/login")({
  head: () => ({ meta: [{ title: "Sign in — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const err = await login(email, password, role);
      if (err) {
        setAuthError(err);
      } else {
        navigate({ to: "/app", replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border/80 shadow-2xl p-8 rounded-lg relative z-10 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black tracking-tighter text-sm leading-none">Skyward</span>
              <span className="font-display font-black tracking-tighter text-sm text-primary leading-none">Properties</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.3em] font-bold text-muted-foreground">CRM</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your secure Skyward Properties partner portal.
          </p>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30 rounded p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5 font-bold">
              Email Address
            </span>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
              placeholder="name@skywardproperties.in"
              autoComplete="email"
              className="w-full bg-secondary border border-border/80 px-3.5 py-2.5 text-sm rounded outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5 font-bold">
              Password
            </span>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-secondary border border-border/80 px-3.5 py-2.5 text-sm rounded outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </label>

          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5 font-bold">
              Access Role
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["admin", "sales"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={[
                    "py-2.5 px-3 text-xs font-mono uppercase tracking-wider border rounded transition-all flex items-center justify-center gap-1.5",
                    role === r
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {r === "admin" ? "Administrator" : "Sales Exec"}
                </button>
              ))}
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
            ) : (
              <>Sign in to Workspace <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-border/50 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Lock className="h-3 w-3 text-emerald-600" />
          <span>Protected by Supabase Auth · 256-bit SSL</span>
        </div>
      </div>
    </div>
  );
}
