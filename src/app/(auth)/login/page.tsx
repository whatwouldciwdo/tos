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
    <main className="min-h-screen flex bg-[#181f21] text-white">
      {/* Panel kiri (gambar) */}
      <section className="relative hidden md:block w-[35%] max-w-md">
        <Image
          src="/login-bg.jpg"
          alt="Login background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-y-0 right-0 w-[2px] bg-[#42ff6b]" />
        <div className="absolute inset-y-0 left-0 flex items-center">
          <p className="ml-10 text-5xl font-semibold tracking-[0.2em] [writing-mode:vertical-rl] rotate-180">
            Login
          </p>
        </div>
      </section>

      {/* Panel kanan (form) */}
      <section className="flex-1 flex items-center justify-center px-6 md:px-16">
        <div className="w-full max-w-md space-y-10">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-6">
              <Image
                src="/pln-tos-logo.jpg"
                alt="TOR Logo"
                width={180}
                height={180}
                className="object-contain"
              />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif font-semibold bg-gradient-to-r from-white via-[#42ff6b] to-white bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Tor Online System
            </h1>
            <p className="mt-3 text-lg text-gray-300">
              Let&apos;s log you in quickly
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <input
                type="text"
                placeholder="username"
                className="w-full rounded-md border border-[#42ff6b] bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#42ff6b] focus:border-transparent placeholder:text-gray-400"
                style={{ color: 'white' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="password"
                className="w-full rounded-md border border-[#42ff6b] bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#42ff6b] focus:border-transparent placeholder:text-gray-400"
                style={{ color: 'white' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#42ff6b] px-4 py-3 text-sm font-semibold text-black hover:bg-[#39e05d] transition disabled:opacity-60"
              >
                {loading ? "Logging in..." : "LOGIN"}
              </button>
            </div>
          </form>

          <div className="flex flex-col items-center gap-1 text-sm md:flex-row md:justify-end md:gap-2">
            <span className="text-gray-300">don&apos;t have an account?</span>
            <button type="button" className="text-[#42ff6b] hover:underline">
              Please Contact Administrator
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
