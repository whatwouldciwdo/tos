// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

async function ensureSuperAdmin(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.isSuperAdmin) {
      return decoded;
    }
    if (decoded.sub) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { position: { include: { positionRoles: { include: { role: true } } } } },
      });
      const hasRole = dbUser?.position?.positionRoles?.some((pr) => pr.role?.name === "SUPER_ADMIN");
      if (dbUser?.isSuperAdmin || hasRole) {
        return decoded;
      }
    }
    throw new Error("FORBIDDEN");
  } catch {
    throw new Error("FORBIDDEN");
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSuperAdmin(req);

    const body = await req.json();
    const {
      name,
      username,
      email,
      password,
      positionId,
      isSuperAdmin,
      isActive,
    } = body as {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      positionId?: number;
      isSuperAdmin?: boolean;
      isActive?: boolean;
    };

    if (!name || !username || !email || !password || !positionId) {
      return NextResponse.json(
        { message: "Nama, username, email, password dan jabatan wajib diisi." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        passwordHash: hashed,
        positionId: Number(positionId),
        isSuperAdmin: !!isSuperAdmin,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    console.error("Create user error:", err);

    if (err.code === "P2002") {
      // unique constraint (email / positionId)
      return NextResponse.json(
        { message: "Email atau jabatan sudah digunakan user lain." },
        { status: 400 }
      );
    }

    if (err.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { message: "Anda belum login." },
        { status: 401 }
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { message: "Hanya Super Admin yang boleh mengakses." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat user." },
      { status: 500 }
    );
  }
}
