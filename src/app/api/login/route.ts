import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { handlePrismaError, errorResponse } from "@/lib/api-response";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

function getClientMeta(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : cfConnectingIp || realIp || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Unknown";
  return { ipAddress, userAgent };
}

async function recordLoginAudit({
  userId,
  username,
  name,
  status,
  ipAddress,
  userAgent,
  failReason,
}: {
  userId?: number | null;
  username: string;
  name?: string | null;
  status: "SUCCESS" | "FAILED";
  ipAddress?: string | null;
  userAgent?: string | null;
  failReason?: string | null;
}) {
  try {
    await prisma.loginLog.create({
      data: {
        userId: userId ?? null,
        username,
        name: name ?? null,
        status,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        failReason: failReason ?? null,
      },
    });
  } catch (logErr) {
    console.error("Failed to record login audit log:", logErr);
  }
}

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);

  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      await recordLoginAudit({
        username: username || "(kosong)",
        status: "FAILED",
        failReason: "Username dan password wajib diisi",
        ipAddress,
        userAgent,
      });
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

    if (!user) {
      await recordLoginAudit({
        username,
        status: "FAILED",
        failReason: "Username tidak ditemukan",
        ipAddress,
        userAgent,
      });
      return errorResponse("Username atau password tidak valid", 401, "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      await recordLoginAudit({
        userId: user.id,
        username: user.username || username,
        name: user.name,
        status: "FAILED",
        failReason: "Akun nonaktif",
        ipAddress,
        userAgent,
      });
      return errorResponse("Username atau password tidak valid", 401, "INVALID_CREDENTIALS");
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await recordLoginAudit({
        userId: user.id,
        username: user.username || username,
        name: user.name,
        status: "FAILED",
        failReason: "Password salah",
        ipAddress,
        userAgent,
      });
      return errorResponse("Username atau password tidak valid", 401, "INVALID_CREDENTIALS");
    }

    // Record login audit log for success
    await recordLoginAudit({
      userId: user.id,
      username: user.username || username,
      name: user.name,
      status: "SUCCESS",
      failReason: null,
      ipAddress,
      userAgent,
    });

    const hasSuperAdminRole = user.position?.positionRoles?.some(
      (pr) => pr.role?.name === "SUPER_ADMIN"
    );

    // Buat token (keep email for notifications)
    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        positionId: user.positionId,
        isSuperAdmin: Boolean(user.isSuperAdmin || hasSuperAdminRole),
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
