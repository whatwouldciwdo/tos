import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

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

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Only images, Word, PDF, and Excel files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "File size exceeds 25MB limit" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const filename = `${uuidv4()}${path.extname(file.name)}`;
    
    // Save to public/uploads directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    // Create directory if not exists
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
      console.log("📁 Created uploads directory:", uploadDir);
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    
    console.log("✅ File uploaded successfully to:", filepath);

    // Return the URL WITHOUT leading slash
    const url = `uploads/${filename}`;

    return NextResponse.json({ 
      url,
      filename,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { message: "Upload failed", error: String(error) },
      { status: 500 }
    );
  }
}