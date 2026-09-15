import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { handlePrismaError, errorResponse } from "@/lib/api-response";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return errorResponse("Username dan password wajib diisi", 400, "MISSING_FIELDS");
    }

    // Use retry logic for database query
    const user = await withRetry(async () => {
      return await prisma.user.findUnique({
        where: { username },
        include: {
          position: {
            include: {
              bidang: true,
              positionRoles: {
                include: { role: true },
              },
            },
          },
        },
      });
    });

    if (!user || !user.isActive) {
      return errorResponse("Username atau password tidak valid", 401, "INVALID_CREDENTIALS");
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return errorResponse("Username atau password tidak valid", 401, "INVALID_CREDENTIALS");
    }

    // Buat token (keep email for notifications)
    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        positionId: user.positionId,
        isSuperAdmin: user.isSuperAdmin,
      },
      JWT_SECRET,
      { expiresIn: "1d" } // 1 hari
    );

    const res = NextResponse.json({ message: "Login berhasil" });

    const isHttps = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.startsWith("https://") : false;

    // set cookie httpOnly
    res.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: isHttps,
      maxAge: 60 * 60 * 24, // 1 hari
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err: any) {
    // Check if it's a Prisma error
    if (err.code && err.code.startsWith('P')) {
      return handlePrismaError(err);
    }

    console.error('Login error:', err.message, err.stack);
    return NextResponse.json(
      {
        error: {
          message: "Terjadi kesalahan saat login: " + err.message,
          code: "INTERNAL_ERROR",
          stack: err.stack,
        },
      },
      { status: 500 }
    );
  }
}
