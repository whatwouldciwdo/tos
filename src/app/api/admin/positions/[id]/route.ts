// src/app/api/admin/positions/[id]/route.ts
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
        { message: "ID jabatan tidak valid." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      code,
      bidangId,
      isGlobal,
      levelOrder,
      isActive,
    } = body as {
      name?: string;
      code?: string;
      bidangId?: number | null;
      isGlobal?: boolean;
      levelOrder?: number | null;
      isActive?: boolean;
    };

    if (!name) {
      return NextResponse.json(
        { message: "Nama jabatan wajib diisi." },
        { status: 400 }
      );
    }

    const finalBidangId =
      isGlobal || !bidangId ? null : Number(bidangId ?? null);

    const position = await prisma.position.update({
      where: { id },
      data: {
        name,
        code: code || null,
        bidangId: finalBidangId,
        isGlobal: !!isGlobal,
        levelOrder: levelOrder != null ? Number(levelOrder) : null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ position }, { status: 200 });
  } catch (err: any) {
    console.error("Update position error:", err);

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
      { message: "Terjadi kesalahan saat mengupdate jabatan." },
      { status: 500 }
    );
  }
}
