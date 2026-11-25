import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, chmod } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import os from "os";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file extension and MIME type
    const ext = path.extname(file.name || "").toLowerCase();
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
    ];

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
      "",
    ];

    const isValidExt = allowedExtensions.includes(ext);
    const isValidMime = !file.type || allowedMimeTypes.includes(file.type);

    if (!isValidExt && !isValidMime) {
      return NextResponse.json(
        {
          message:
            "Format file tidak didukung. Hanya file PDF, Word, Excel, dan Gambar yang diperbolehkan.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "Ukuran file melebihi batas 25MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const filename = `${uuidv4()}${ext || path.extname(file.name)}`;

    // Try primary directory: public/uploads
    const primaryDir = path.join(process.cwd(), "public", "uploads");
    const fallbackDir = path.join(os.tmpdir(), "tor_uploads");

    let savedPath = "";

    try {
      if (!fs.existsSync(primaryDir)) {
        await mkdir(primaryDir, { recursive: true });
      }
      const primaryFilepath = path.join(primaryDir, filename);
      await writeFile(primaryFilepath, buffer);
      try {
        await chmod(primaryFilepath, 0o666);
      } catch {}
      savedPath = primaryFilepath;
      console.log("✅ File uploaded successfully to primary:", primaryFilepath);
    } catch (primaryErr: any) {
      console.warn(
        "⚠️ Primary upload directory failed (e.g. permission denied):",
        primaryErr.message
      );
      // Fallback to os.tmpdir() which is always writable
      if (!fs.existsSync(fallbackDir)) {
        await mkdir(fallbackDir, { recursive: true });
      }
      const fallbackFilepath = path.join(fallbackDir, filename);
      await writeFile(fallbackFilepath, buffer);
      try {
        await chmod(fallbackFilepath, 0o666);
      } catch {}
      savedPath = fallbackFilepath;
      console.log(
        "✅ File uploaded successfully to fallback:",
        fallbackFilepath
      );
    }

    // Upload to Cloudflare R2 for multi-server sync
    try {
      const contentType = file.type || "application/octet-stream";
      await uploadToR2(buffer, filename, contentType);
    } catch (r2Err: any) {
      console.warn("⚠️ Cloudflare R2 upload warning:", r2Err.message);
    }

    // Return the URL WITHOUT leading slash
    const url = `uploads/${filename}`;

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      type: file.type || ext,
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      {
        message: "Upload failed: " + (error?.message || String(error)),
        error: String(error),
      },
      { status: 500 }
    );
  }
}
