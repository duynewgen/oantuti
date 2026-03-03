import type { CharacterPoses } from "@/app/_components/types";

const STORAGE_KEY = "oantuti-saved-characters";
const MAX_SAVED = 5;

export type SavedCharacter = {
  id: string;
  characterPoses: CharacterPoses;
  savedAt: number;
};

export function getSavedCharacters(): SavedCharacter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCharacter[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSavedCharacter(characterPoses: CharacterPoses): void {
  const list = getSavedCharacters();
  const entry: SavedCharacter = {
    id: crypto.randomUUID(),
    characterPoses,
    savedAt: Date.now(),
  };
  const next = [entry, ...list].slice(0, MAX_SAVED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeSavedCharacter(id: string): void {
  const list = getSavedCharacters().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
