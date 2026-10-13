import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isActiveApprover(tor: any, user: any): Promise<boolean> {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (tor.statusStage === "DRAFT" || tor.statusStage === "REVISE" || tor.isFinalApproved) {
    return false;
  }

  const workflow = await prisma.workflow.findUnique({
    where: { bidangId: tor.bidangId },
    include: {
      steps: {
        include: { position: true },
      },
    },
  });

  if (!workflow) return false;

  const currentStep = workflow.steps.find(
    (s) => s.stepNumber === tor.currentStepNumber
  );
  if (!currentStep) return false;

  if (user.positionId === currentStep.positionId) return true;
  if (
    user.position?.name &&
    currentStep.position?.name &&
    user.position.name === currentStep.position.name
  ) {
    return true;
  }

  return false;
}

// GET /api/tor/[id]/comments
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await getCurrentUser();
    const { id } = await context.params;
    const torId = parseInt(id);

    const tor = await prisma.tor.findUnique({
      where: { id: torId },
      select: { fieldComments: true },
    });

    if (!tor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    const fieldComments = Array.isArray((tor as any).fieldComments)
      ? (tor as any).fieldComments
      : [];

    return NextResponse.json({ fieldComments });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Gagal mengambil komentar field" },
      { status: 500 }
    );
  }
}

// POST /api/tor/[id]/comments - Tambah komentar/revisi pada field
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const torId = parseInt(id);
    const body = await req.json();

    const { fieldKey, fieldLabel, tabId, tabLabel, comment } = body;

    if (!fieldKey || !comment || !String(comment).trim()) {
      return NextResponse.json(
        { message: "Field dan isi komentar wajib diisi" },
        { status: 400 }
      );
    }

    const tor = await prisma.tor.findUnique({
      where: { id: torId },
    });

    if (!tor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { position: true },
    });

    const canComment = await isActiveApprover(tor, dbUser);
    if (!canComment) {
      return NextResponse.json(
        { message: "Hanya peng-approve aktif pada tahap ini yang dapat menambahkan komentar revisi" },
        { status: 403 }
      );
    }

    const existingComments: any[] = Array.isArray((tor as any).fieldComments)
      ? (tor as any).fieldComments
      : [];

    const newComment = {
      id: uuidv4(),
      fieldKey: String(fieldKey),
      fieldLabel: String(fieldLabel || fieldKey),
      tabId: String(tabId || "informasi-umum"),
      tabLabel: String(tabLabel || "Informasi Umum"),
      comment: String(comment).trim(),
      authorId: user.id,
      authorName: dbUser?.name || user.name || "Approver",
      authorPosition: dbUser?.position?.name || user.position?.name || "Approver",
      stepNumber: tor.currentStepNumber,
      statusStage: tor.statusStage,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...existingComments, newComment];

    await prisma.tor.update({
      where: { id: torId },
      data: {
        fieldComments: updatedComments as any,
      } as any,
    });

    return NextResponse.json({
      message: "Komentar berhasil ditambahkan",
      comment: newComment,
      fieldComments: updatedComments,
    });
  } catch (error: any) {
    console.error("Error adding field comment:", error);
    return NextResponse.json(
      { message: error.message || "Gagal menambahkan komentar" },
      { status: 500 }
    );
  }
}

// PATCH /api/tor/[id]/comments - Update isi komentar atau tandai sudah direvisi (resolved)
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const torId = parseInt(id);
    const body = await req.json();

    const { commentId, comment, resolved } = body;

    if (!commentId) {
      return NextResponse.json(
        { message: "commentId wajib diisi" },
        { status: 400 }
      );
    }

    const tor = await prisma.tor.findUnique({
      where: { id: torId },
    });

    if (!tor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { position: true },
    });

    const existingComments: any[] = Array.isArray((tor as any).fieldComments)
      ? (tor as any).fieldComments
      : [];

    const target = existingComments.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json(
        { message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const isAuthor = target.authorId === user.id;
    const isCreator = tor.creatorUserId === user.id;
    const isApprover = await isActiveApprover(tor, dbUser);

    if (comment !== undefined && !isAuthor && !dbUser?.isSuperAdmin) {
      return NextResponse.json(
        { message: "Hanya pembuat komentar yang dapat mengubah isi komentar" },
        { status: 403 }
      );
    }

    if (resolved !== undefined && !isCreator && !isAuthor && !isApprover && !dbUser?.isSuperAdmin) {
      return NextResponse.json(
        { message: "Tidak memiliki akses untuk mengubah status komentar" },
        { status: 403 }
      );
    }

    const updatedComments = existingComments.map((c) => {
      if (c.id !== commentId) return c;
      return {
        ...c,
        ...(comment !== undefined ? { comment: String(comment).trim() } : {}),
        ...(resolved !== undefined
          ? {
              resolved: Boolean(resolved),
              resolvedAt: resolved ? new Date().toISOString() : undefined,
              resolvedByName: resolved ? (dbUser?.name || user.name) : undefined,
            }
          : {}),
      };
    });

    await prisma.tor.update({
      where: { id: torId },
      data: {
        fieldComments: updatedComments as any,
      } as any,
    });

    return NextResponse.json({
      message: "Komentar berhasil diperbarui",
      fieldComments: updatedComments,
    });
  } catch (error: any) {
    console.error("Error updating field comment:", error);
    return NextResponse.json(
      { message: error.message || "Gagal memperbarui komentar" },
      { status: 500 }
    );
  }
}

// DELETE /api/tor/[id]/comments - Hapus komentar pada field
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const torId = parseInt(id);

    const url = new URL(req.url);
    let commentId = url.searchParams.get("commentId");
    if (!commentId) {
      const body = await req.json().catch(() => ({}));
      commentId = body.commentId;
    }

    if (!commentId) {
      return NextResponse.json(
        { message: "commentId wajib diisi" },
        { status: 400 }
      );
    }

    const tor = await prisma.tor.findUnique({
      where: { id: torId },
    });

    if (!tor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    const existingComments: any[] = Array.isArray((tor as any).fieldComments)
      ? (tor as any).fieldComments
      : [];

    const target = existingComments.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json(
        { message: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    if (target.authorId !== user.id && !dbUser?.isSuperAdmin) {
      return NextResponse.json(
        { message: "Hanya pembuat komentar yang dapat menghapus komentar ini" },
        { status: 403 }
      );
    }

    const updatedComments = existingComments.filter((c) => c.id !== commentId);

    await prisma.tor.update({
      where: { id: torId },
      data: {
        fieldComments: updatedComments as any,
      } as any,
    });

    return NextResponse.json({
      message: "Komentar berhasil dihapus",
      fieldComments: updatedComments,
    });
  } catch (error: any) {
    console.error("Error deleting field comment:", error);
    return NextResponse.json(
      { message: error.message || "Gagal menghapus komentar" },
      { status: 500 }
    );
  }
}
