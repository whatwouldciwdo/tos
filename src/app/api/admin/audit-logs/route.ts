// src/app/api/admin/audit-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

function ensureSuperAdmin(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.isSuperAdmin) {
      throw new Error("FORBIDDEN");
    }
    return decoded;
  } catch {
    throw new Error("FORBIDDEN");
  }
}

export async function GET(req: NextRequest) {
  try {
    ensureSuperAdmin(req);

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const exportAll = searchParams.get("exportAll") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const where: any = {};

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        // Start of start date
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        // End of end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Status filter
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Search query (username, name, ipAddress)
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { ipAddress: { contains: q, mode: "insensitive" } },
        { failReason: { contains: q, mode: "insensitive" } },
      ];
    }

    if (exportAll) {
      const logs = await prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: {
                select: {
                  name: true,
                  bidang: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ logs });
    }

    const [total, logs, totalSuccess, totalFailed] = await Promise.all([
      prisma.loginLog.count({ where }),
      prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: {
                select: {
                  name: true,
                  bidang: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      }),
      // Stats for filtered date range or overall
      prisma.loginLog.count({
        where: {
          ...(where.createdAt ? { createdAt: where.createdAt } : {}),
          status: "SUCCESS",
        },
      }),
      prisma.loginLog.count({
        where: {
          ...(where.createdAt ? { createdAt: where.createdAt } : {}),
          status: "FAILED",
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        totalFiltered: total,
        totalSuccess,
        totalFailed,
      },
    });
  } catch (err: any) {
    console.error("Audit log error:", err);

    if (err.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { message: "Anda belum login." },
        { status: 401 }
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { message: "Hanya Super Admin yang boleh mengakses audit log." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat audit log." },
      { status: 500 }
    );
  }
}
