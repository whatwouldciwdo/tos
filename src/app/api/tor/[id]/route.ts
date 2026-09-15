import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Helper to get current user from token
async function getCurrentUser(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = jwt.verify(token, JWT_SECRET) as any;
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: {
      position: {
        include: {
          bidang: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tor/[id] - Get ToR detail
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await context.params;

    const tor = await prisma.tor.findUnique({
      where: { id: parseInt(id) },
      include: {
        bidang: true,
        creator: {
          include: {
            position: true,
          },
        },
        budgetItems: {
          orderBy: { orderIndex: "asc" },
        },
        history: {
          include: {
            actedBy: {
              include: {
                position: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!tor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    // Check access: creator, super admin, or approver
    const hasAccess =
      user.isSuperAdmin ||
      tor.creatorUserId === user.id;
      // TODO: Add approver check based on workflow

    if (!hasAccess) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(tor);
  } catch (error: any) {
    console.error("Error fetching ToR:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch ToR" },
      { status: 500 }
    );
  }
}

// PUT /api/tor/[id] - Update ToR
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await context.params;
    const body = await req.json();

    const existingTor = await prisma.tor.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    // Only creator can edit, and only if status is DRAFT or REVISE
    if (existingTor.creatorUserId !== user.id && !user.isSuperAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Allow editing only in DRAFT or REVISE status
    if (existingTor.statusStage !== "DRAFT" && existingTor.statusStage !== "REVISE" && !user.isSuperAdmin) {
      return NextResponse.json(
        { message: "Can only edit ToR in DRAFT or REVISE status" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      coverImage,
      // Tab 1: Informasi Umum
      creationDate,
      creationYear,
      budgetType,
      workType,
      program,
      rkaYear,
      projectStartDate,
      projectEndDate,
      executionYear,
      materialJasaValue,
      budgetCurrency,
      budgetAmount,
      // Tab 2: Pendahuluan
      introduction,
      background,
      objective,
      scope,
      warranty,
      acceptanceCriteria,
      // Tab 3: Tahapan Pekerjaan
      duration,
      durationUnit,
      technicalSpec,
      workStages,
      workStagesExplanation,
      deliveryRequirements,
      handoverPoint,
      handoverMechanism,
      generalProvisions,
      deliveryPoint,
      deliveryMechanism,
      // Tab 4: Usulan
      directorProposal,
      directorProposals,
      fieldDirectorProposal,
      fieldDirectorProposals,
      vendorRequirements,
      procurementMethod,
      paymentTerms,
      penaltyRules,
      otherRequirements,
      riskAssessment, // Risk Assessment
      revisionTermOfReference,
      subtotal,
      ppn,
      pph,
      grandTotal,
      ppnRate,
      ppnIncluded,
      // Tab 5: Lembar Pengesahan
      approvalSignatures,
      // Tab 6: Lampiran
      technicalParticulars,
      inspectionTestingPlans,
      documentRequestSheets,
      performanceGuarantees,
      attachments,
      // Budget items
      budgetItems,
    } = body;

    // Update ToR
    const updatedTor = await prisma.tor.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        coverImage,
        // Tab 1
        creationDate: creationDate ? new Date(creationDate) : undefined,
        creationYear,
        budgetType,
        workType,
        program,
        rkaYear,
        projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
        projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
        executionYear,
        materialJasaValue,
        budgetCurrency,
        budgetAmount,
        // Tab 2
        introduction,
        background,
        objective,
        scope,
        warranty,
        acceptanceCriteria,
        // Tab 3
        duration,
        durationUnit,
        technicalSpec,
        workStagesData: workStages,
        workStagesExplanation,
        deliveryRequirements,
        handoverPoint,
        handoverMechanism,
        generalProvisions,
        deliveryPoint,
        deliveryMechanism,
        // Tab 4
        directorProposal,
        directorProposals,
        fieldDirectorProposal,
        fieldDirectorProposals,
        vendorRequirements,
        procurementMethod,
        paymentTerms,
        penaltyRules,
        otherRequirements,
        riskAssessment, // Risk Assessment
        revisionTermOfReference,
        subtotal,
        ppn,
        pph,
        grandTotal,
        ppnRate,
        ppnIncluded,
        // Tab 5
        approvalSignatures,
        // Tab 6
        technicalParticulars,
        inspectionTestingPlans,
        documentRequestSheets,
        performanceGuarantees,
        attachments,
        // Budget items - delete old and create new
        budgetItems: budgetItems
          ? {
              deleteMany: {},
              create: budgetItems.map((item: any, index: number) => ({
                item: item.item,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                orderIndex: index,
              })),
            }
          : undefined,
      },
      include: {
        bidang: true,
        creator: {
          include: {
            position: true,
          },
        },
        budgetItems: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json(updatedTor);
  } catch (error: any) {
    console.error("Error updating ToR:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update ToR" },
      { status: 500 }
    );
  }
}

// DELETE /api/tor/[id] - Delete ToR (only draft)
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await context.params;

    const existingTor = await prisma.tor.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTor) {
      return NextResponse.json({ message: "ToR not found" }, { status: 404 });
    }

    // Only creator or super admin can delete
    if (existingTor.creatorUserId !== user.id && !user.isSuperAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Only delete if DRAFT
    if (existingTor.statusStage !== "DRAFT") {
      return NextResponse.json(
        { message: "Can only delete ToR in DRAFT status" },
        { status: 400 }
      );
    }

    await prisma.tor.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "ToR deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting ToR:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete ToR" },
      { status: 500 }
    );
  }
}
