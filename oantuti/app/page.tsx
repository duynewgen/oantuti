"use client";

import { useCallback, useRef, useState } from "react";
import type { CharacterPoses } from "@/app/_components/types";
import { SESSION_KEY } from "@/app/_components/play/sounds";
import {
  HomepageHero,
  CharacterUploadSection,
  HandTestSection,
  useHomepageHandTest,
} from "@/app/_components/homepage";

export default function HomePage() {
  const fileUrlRef = useRef<string | null>(null);

  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [characterPoses, setCharacterPoses] = useState<CharacterPoses | null>(null);
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { videoRef, canvasRef, testReady, testStatus, testMove } = useHomepageHandTest();

  const onImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      fileUrlRef.current = objectUrl;
      setCartoonImage(objectUrl);
      setCharacterPoses(null);
      setGenerationStatus("generating");
      setGenerationError(null);

      try {
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch("/api/generate-character-poses", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? `Generation failed (${res.status})`);
        }

        const poses = (await res.json()) as CharacterPoses;
        setCharacterPoses(poses);
        setGenerationStatus("ready");
      } catch (err) {
        setGenerationStatus("error");
        setGenerationError(
          err instanceof Error ? err.message : "Failed to generate character poses"
        );
      }
    },
    []
  );

  const handleStartGame = useCallback(() => {
    if (!characterPoses) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(characterPoses));
    }
  }, [characterPoses]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#fef08a,_#bfdbfe_45%,_#86efac)] px-4 py-6 text-slate-900 md:px-8">
      <main className="w-full max-w-5xl">
        <section className="w-full rounded-3xl border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0_#0f172a] md:p-8">
          <HomepageHero />

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <CharacterUploadSection
              cartoonImage={cartoonImage}
              characterPoses={characterPoses}
              generationStatus={generationStatus}
              generationError={generationError}
              onImageUpload={onImageUpload}
              onStartGame={handleStartGame}
            />

            <HandTestSection
              videoRef={videoRef}
              canvasRef={canvasRef}
              testReady={testReady}
              testStatus={testStatus}
              testMove={testMove}
            />
          </div>

          <p className="mt-8 text-center text-sm text-slate-600">
            &ldquo;Oantuti&rdquo; is the Vietnamese name of rock-paper-scissors, sounds like &ldquo;one, two, three&rdquo;.
          </p>
        </section>
      </main>
    </div>
  );
}
