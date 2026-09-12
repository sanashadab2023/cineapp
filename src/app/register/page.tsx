"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Film, Lock, Mail, User, AlertCircle, ArrowRight } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-gold-600 to-amber-300 shadow-glow">
            <Film className="h-6 w-6 text-cinema-950" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Create CineBook Account</h1>
          <p className="text-sm text-zinc-400">Join to book tickets, manage seat holds, and receive digital passes</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Full Name</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full rounded-xl border border-white/10 bg-cinema-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-gold-500 focus:outline-none"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Email Address</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-cinema-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-gold-500 focus:outline-none"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Password</label>
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-cinema-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-gold-500 focus:outline-none"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 py-3 text-sm font-bold text-cinema-950 shadow-glow transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cinema-950 border-t-transparent" />
              ) : (
                <>
                  Register <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-white/5 pt-4 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="font-semibold text-gold-400 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
