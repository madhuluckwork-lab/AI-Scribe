import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-api";
import { uploadAudio } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const contentType = file.type || "audio/webm";
    const extension = contentType.includes("mp4") ? "mp4" : "webm";
    const buffer = Buffer.from(await file.arrayBuffer());

    const { url, key } = await uploadAudio({
      userId: session.user.id,
      file: buffer,
      contentType,
      fileExtension: extension,
    });

    return NextResponse.json({ uploadUrl: url, fileKey: key, blobUrl: url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
