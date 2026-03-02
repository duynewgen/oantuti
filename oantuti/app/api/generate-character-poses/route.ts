import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

const FAL_MODEL = "bria/fibo-edit/replace_object_by_text";

const INSTRUCTIONS: Record<"rock" | "paper" | "scissors", string> = {
  rock: "Replace the character's hands with both hands in rock gesture: closed fists, fingers curled into palms.",
  paper: "Replace the character's hands with both hands in paper gesture: open palms, all fingers spread flat.",
  scissors: "Replace the character's hands with both hands in scissors gesture: peace sign, index and middle fingers extended upward in a V shape, other fingers curled.",
};

export async function POST(request: NextRequest) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured. Add it to .env.local" },
      { status: 500 },
    );
  }

  fal.config({ credentials: process.env.FAL_KEY });

  let imageUrl: string;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please provide a valid image file" },
        { status: 400 },
      );
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

  for (const move of ["rock", "paper", "scissors"] as const) {
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
    } catch (err) {
      console.error(`FAL Fibo Edit failed for ${move}:`, err);
      results[move] = imageUrl;
    }
  }

  return NextResponse.json(results);
}
