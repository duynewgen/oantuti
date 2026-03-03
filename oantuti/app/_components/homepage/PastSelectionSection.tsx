"use client";

import { useRouter } from "next/navigation";
import type { SavedCharacter } from "./savedCharacters";
import { SESSION_KEY } from "@/app/_components/play/sounds";

type PastSelectionSectionProps = {
  savedCharacters: SavedCharacter[];
  onRemove: (id: string) => void;
};

export function PastSelectionSection({
  savedCharacters,
  onRemove,
}: PastSelectionSectionProps) {
  const router = useRouter();

  const handleUse = (characterPoses: SavedCharacter["characterPoses"]) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(characterPoses));
    router.push("/play");
  };

  return (
    <div className="mt-8 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
        Past characters
      </h2>
      {savedCharacters.length === 0 ? (
        <p className="text-sm text-slate-500">No past characters yet.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Revenge time? Choose one of your past opponents to fight again!
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {savedCharacters.map((saved) => (
          <li
            key={saved.id}
            className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3 transition hover:border-slate-400 hover:bg-slate-100"
          >
            <button
              type="button"
              onClick={() => handleUse(saved.characterPoses)}
              className="flex flex-1 items-center gap-3 rounded-lg border-2 border-slate-900 bg-white p-2 text-left shadow-[2px_2px_0_#0f172a] transition hover:bg-emerald-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <div
                className="h-14 w-14 shrink-0 rounded-lg border-2 border-slate-900 bg-cover bg-center"
                style={{ backgroundImage: `url(${saved.characterPoses.rock})` }}
              />
              <span className="text-sm font-bold">Use this character</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(saved.id)}
              className="shrink-0 rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:border-red-400 hover:bg-red-50 hover:text-red-700"
              aria-label="Remove from saved"
            >
                Remove
              </button>
          </li>
        ))}
          </ul>
        </>
      )}
    </div>
  );
}
