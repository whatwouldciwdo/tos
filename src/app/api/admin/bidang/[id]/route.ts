// src/app/api/admin/bidang/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

async function ensureSuperAdmin(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) throw new Error("UNAUTHENTICATED");

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.isSuperAdmin) return decoded;
    if (decoded.sub) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { position: { include: { positionRoles: { include: { role: true } } } } },
      });
      const hasRole = dbUser?.position?.positionRoles?.some((pr) => pr.role?.name === "SUPER_ADMIN");
      if (dbUser?.isSuperAdmin || hasRole) return decoded;
    }
    throw new Error("FORBIDDEN");
  } catch {
    throw new Error("FORBIDDEN");
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    await ensureSuperAdmin(req);

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID bidang tidak valid." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, code, isActive } = body as {
      name?: string;
      code?: string;
      isActive?: boolean;
    };

    if (!name || !code) {
      return NextResponse.json(
        { message: "Nama dan kode bidang wajib diisi." },
        { status: 400 }
      );
    }

    const bidang = await prisma.bidang.update({
      where: { id },
      data: {
        name,
        code,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ bidang }, { status: 200 });
  } catch (err: any) {
    console.error("Update bidang error:", err);

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

    if (err.code === "P2002") {
      return NextResponse.json(
        { message: "Kode bidang sudah digunakan." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate bidang." },
      { status: 500 }
    );
  }
}
