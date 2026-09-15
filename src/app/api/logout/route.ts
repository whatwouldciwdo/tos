import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ message: "Logout berhasil" });

  const isHttps = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.startsWith("https://") : false;

  // Hapus cookie dengan set maxAge 0
  res.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: isHttps,
    maxAge: 0,
    path: "/",
  });

  return res;
}
