import type { OpponentState } from "../types";

export function getSpriteStateClass(state: OpponentState): string {
  if (state === "thinking") return "opponent-sprite-thinking";
  if (state === "reveal") return "opponent-sprite-reveal";
  return "opponent-sprite-idle";
}
