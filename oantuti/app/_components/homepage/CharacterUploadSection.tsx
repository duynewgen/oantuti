"use client";

import { type ChangeEvent } from "react";
import Link from "next/link";
import type { CharacterPoses } from "@/app/_components/types";

type CharacterUploadSectionProps = {
  cartoonImage: string | null;
  characterPoses: CharacterPoses | null;
  generationStatus: "idle" | "generating" | "ready" | "error";
  generationError: string | null;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onStartGame: () => void;
};

export function CharacterUploadSection({
  cartoonImage,
  characterPoses,
  generationStatus,
  generationError,
  onImageUpload,
  onStartGame,
}: CharacterUploadSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase text-slate-600">
          Upload your character
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          disabled={generationStatus === "generating"}
          className="mt-3 block w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-3 text-sm file:mr-4 file:rounded-lg file:border-2 file:border-slate-900 file:bg-emerald-100 file:px-4 file:py-2 file:font-bold file:text-slate-900 hover:file:bg-emerald-200 disabled:opacity-50"
        />
      </div>

      <div className="relative min-h-[280px] overflow-hidden rounded-2xl border-2 border-slate-900 bg-[linear-gradient(135deg,#fecdd3,#dbeafe,#d9f99d)]">
        {cartoonImage ? (
          <>
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-6">
              <div
                className="h-48 w-40 shrink-0 rounded-2xl border-4 border-slate-900 bg-cover bg-center shadow-lg"
                style={{
                  backgroundImage: `url(${
                    characterPoses ? characterPoses.rock : cartoonImage
                  })`,
                }}
              />
              {generationStatus === "generating" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/80 text-white">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                  <p className="text-sm font-bold">
                    AI animating character&apos;s hands...
                  </p>
                  <p className="text-xs opacity-80">
                    Generating rock, paper, scissors poses
                  </p>
                  <p className="text-xs opacity-60">
                    This may take 30–60 seconds
                  </p>
                </div>
              )}
              {generationStatus === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-red-900/90 p-6 text-white">
                  <p className="text-sm font-bold">Generation failed</p>
                  <p className="text-center text-xs opacity-90">{generationError}</p>
                  <p className="text-center text-xs opacity-70">
                    Add FAL_KEY to .env.local to enable AI generation.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <p className="mt-4 text-md font-semibold text-slate-600">
              Upload an image of anyone or any character
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Oantuti will magically animate your image into a character with hands for rock, paper, scissors!
            </p>
          </div>
        )}
      </div>

      {generationStatus === "ready" && characterPoses && (
        <Link
          href="/play"
          onClick={onStartGame}
          className="block w-full rounded-xl border-2 border-slate-900 bg-emerald-500 px-6 py-4 text-center font-bold uppercase text-white shadow-[4px_4px_0_#0f172a] transition hover:bg-emerald-600 hover:shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Play game
        </Link>
      )}
    </div>
  );
}
