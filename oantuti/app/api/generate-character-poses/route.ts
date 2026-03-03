import { fal } from "@fal-ai/client";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const FAL_MODEL = "bria/fibo-edit/replace_object_by_text";

type PoseResults = Record<"rock" | "paper" | "scissors", string>;

// In-memory cache: image hash → pose URLs (saves 3 FAL calls per repeat upload)
const poseCache = new Map<string, PoseResults>();

function getImageHash(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

const INSTRUCTIONS: Record<"rock" | "paper" | "scissors", string> = {
  rock: "Replace the character's hands with both hands in rock gesture: closed fists, fingers curled into palms.",
  paper: "Replace the character's hands with both hands in paper gesture: open palms, all fingers spread flat.",
  scissors: "Replace the character's hands with both hands in scissors gesture: peace sign, index and middle fingers extended upward in a V shape, other fingers curled.",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured. Add it to .env.local" },
      { status: 500 },
    );
  }

  fal.config({ credentials: process.env.FAL_KEY });

  let imageUrl: string;
  let imageHash: string;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please provide a valid image file" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Use an image under 10MB." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    imageHash = getImageHash(buffer);

    const cached = poseCache.get(imageHash);
    if (cached) {
      return NextResponse.json(cached);
    }

    const url = await fal.storage.upload(file);
    imageUrl = url;
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }

  const results: Record<"rock" | "paper" | "scissors", string> = {
    rock: "",
    paper: "",
    scissors: "",
  };

  const maxRetries = 2; // first attempt + 1 retry on 500

  for (const move of ["rock", "paper", "scissors"] as const) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fal.subscribe(FAL_MODEL, {
          input: {
            image_url: imageUrl,
            instruction: INSTRUCTIONS[move],
          },
        });

        const out = result.data as { image?: { url?: string } };
        if (out?.image?.url) {
          results[move] = out.image.url;
        } else {
          results[move] = imageUrl;
        }
        break;
      } catch (err) {
        const is500 =
          err &&
          typeof err === "object" &&
          "status" in err &&
          (err as { status?: number }).status === 500;
        if (is500 && attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 2000)); // wait 2s before retry
          continue;
        }
        return NextResponse.json(
          {
            error:
              "There's something wrong with the image tho. Could we try another image?.",
          },
          { status: 502 }
        );
      }
    }
  }

  poseCache.set(imageHash, { ...results });
  return NextResponse.json(results);
}
