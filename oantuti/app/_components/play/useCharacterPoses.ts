"use client";

import { useEffect, useState } from "react";
import type { Move } from "@/app/_components/types";
import { SESSION_KEY } from "./sounds";

export type CharacterPosesState = Record<Move, string> | null;

export function useCharacterPoses(setStatus: (s: string) => void) {
  const [characterPoses, setCharacterPoses] = useState<CharacterPosesState>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setStatus("No character found. Redirecting...");
      window.location.href = "/";
      return;
    }
    try {
      const poses = JSON.parse(stored) as Record<Move, string>;
      if (poses?.rock && poses?.paper && poses?.scissors) {
        setCharacterPoses(poses);
      } else {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
    }
  }, [setStatus]);

  return characterPoses;
}
