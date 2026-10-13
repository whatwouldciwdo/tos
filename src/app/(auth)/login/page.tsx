"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || data.message || "Login gagal");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex neu-bg text-white">
      {/* Panel kiri (gambar) */}
      <section className="relative hidden md:block w-[35%] max-w-md shadow-[8px_0_24px_rgba(0,0,0,0.45)]">
        <Image
          src="/login-bg.jpg"
          alt="Login background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-y-0 right-0 w-[2px] bg-[#42ff6b] shadow-[0_0_12px_rgba(66,255,107,0.6)]" />
        <div className="absolute inset-y-0 left-0 flex items-center">
          <p className="ml-10 text-5xl font-semibold tracking-[0.2em] [writing-mode:vertical-rl] rotate-180 drop-shadow-lg">
            Login
          </p>
        </div>
      </section>

      {/* Panel kanan (form) */}
      <section className="flex-1 flex items-center justify-center px-6 md:px-16 py-10">
        <div className="w-full max-w-md neu-card p-8 md:p-10 space-y-8">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-6 p-3 neu-inset rounded-2xl">
              <Image
                src="/pln-tos-logo.jpg"
                alt="TOR Logo"
                width={150}
                height={150}
                className="object-contain rounded-xl"
              />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-serif font-semibold bg-gradient-to-r from-white via-[#42ff6b] to-white bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Tor Online System
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Let&apos;s log you in quickly
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <input
                type="text"
                placeholder="username"
                className="w-full neu-inset px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
                style={{ color: "#ffffff" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="password"
                className="w-full neu-inset px-4 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#42ff6b]/50 placeholder:text-gray-400"
                style={{ color: "#ffffff" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="neu-inset-sm px-3.5 py-2.5 border border-red-500/30">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full neu-btn-accent px-4 py-3.5 text-sm font-bold tracking-wider disabled:opacity-60"
              >
                {loading ? "Logging in..." : "LOGIN"}
              </button>
            </div>
          </form>

          <div className="flex flex-col items-center gap-1 text-xs md:flex-row md:justify-center md:gap-2 pt-2">
            <span className="text-gray-400">don&apos;t have an account?</span>
            <button type="button" className="text-[#42ff6b] hover:underline font-medium">
              Please Contact Administrator
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
