import type { Move } from "./types";

export type RoundResult = "win" | "lose" | "draw";

export function getRoundResult(player: Move, bot: Move): RoundResult {
  if (player === bot) return "draw";
  if (
    (player === "rock" && bot === "scissors") ||
    (player === "paper" && bot === "rock") ||
    (player === "scissors" && bot === "paper")
  ) {
    return "win";
  }
  return "lose";
}

function getCounterMove(move: Move): Move {
  if (move === "rock") return "paper";
  if (move === "paper") return "scissors";
  return "rock";
}

export function pickAiMove(history: Move[]): Move {
  const fallback: Move[] = ["rock", "paper", "scissors"];
  if (history.length === 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  const counts = history.reduce(
    (acc, move) => {
      acc[move] += 1;
      return acc;
    },
    { rock: 0, paper: 0, scissors: 0 },
  );
  const predictedPlayer = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "rock") as Move;
  if (Math.random() < 0.7) return getCounterMove(predictedPlayer);
  return fallback[Math.floor(Math.random() * fallback.length)];
}
