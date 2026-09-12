"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Film, Ticket, MapPin, Calendar, ShieldCheck, User, LogOut, Menu, X } from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/", label: "Movies", icon: Film },
    { href: "/cinemas", label: "Cinemas", icon: MapPin },
    { href: "/showtimes", label: "Showtimes", icon: Calendar },
    { href: "/bookings", label: "My Bookings", icon: Ticket },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-cinema-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-gold-600 via-gold-500 to-amber-300 shadow-glow transition-transform group-hover:scale-105">
            <Film className="h-5 w-5 text-cinema-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-gold-400">
              Cine<span className="text-gold-400">Book</span>
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
              Premiere Experience
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-gold-400 shadow-inner"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-gold-400" : "text-zinc-400"}`} />
                {link.label}
              </Link>
            );
          })}

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                pathname === "/admin"
                  ? "bg-purple-950/60 text-purple-300 border border-purple-500/30"
                  : "text-purple-300 hover:bg-purple-950/40"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Auth / Profile Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-cinema-900 px-3 py-1.5 text-xs text-zinc-300">
                <User className="h-3.5 w-3.5 text-gold-400" />
                <span className="font-semibold text-white">{user.name}</span>
                {user.role === "ADMIN" && (
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-red-500/20 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-gold-500 to-amber-500 px-4 py-2 text-sm font-semibold text-cinema-950 shadow-glow transition-all hover:brightness-110"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-cinema-950 px-4 pt-2 pb-6 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-white/10 text-gold-400" : "text-zinc-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-purple-300"
              >
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                Admin Portal
              </Link>
            )}

            <div className="mt-4 border-t border-white/10 pt-4">
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-zinc-400">
                    Signed in as <span className="font-semibold text-white">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/20 py-2 text-sm font-semibold text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-medium text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-lg bg-gold-500 py-2 text-sm font-semibold text-cinema-950"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
