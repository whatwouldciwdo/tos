import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // Prevent directory traversal attacks
    const safeFilename = path.basename(filename);

    const candidatePaths = [
      path.join(process.cwd(), "public", "uploads", safeFilename),
      path.join(os.tmpdir(), "tor_uploads", safeFilename),
      path.join("/tmp", "tor_uploads", safeFilename),
      path.join("/tmp", "uploads", safeFilename),
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(safeFilename).toLowerCase();

        const mimeMap: Record<string, string> = {
          ".pdf": "application/pdf",
          ".doc": "application/msword",
          ".docx":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".xls": "application/vnd.ms-excel",
          ".xlsx":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };

        const contentType = mimeMap[ext] || "application/octet-stream";

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${safeFilename}"`,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return NextResponse.json({ message: "File not found" }, { status: 404 });
  } catch (error: any) {
    console.error("Error serving uploaded file:", error);
    return NextResponse.json(
      { message: "Failed to read file", error: String(error) },
      { status: 500 }
    );
  }
}
