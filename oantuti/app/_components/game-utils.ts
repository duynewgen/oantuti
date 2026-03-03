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

function getRandomMove(): Move {
  const moves: Move[] = ["rock", "paper", "scissors"];
  return moves[Math.floor(Math.random() * moves.length)];
}

function getMostFrequentMove(moves: Move[]): Move {
  const counts = moves.reduce(
    (acc, move) => {
      acc[move] += 1;
      return acc;
    },
    { rock: 0, paper: 0, scissors: 0 },
  );

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "rock") as Move;
}

// Smarter AI:
// - Uses transition patterns between recent moves to predict the next player move.
// - Strongly biases towards the counter move, with a small amount of randomness so it
//   never feels completely deterministic.
export function pickAiMove(history: Move[]): Move {
  if (history.length === 0) {
    return getRandomMove();
  }

  // Build a simple transition table: given previous move → distribution of next moves.
  const transitions: Record<Move, { rock: number; paper: number; scissors: number }> = {
    rock: { rock: 0, paper: 0, scissors: 0 },
    paper: { rock: 0, paper: 0, scissors: 0 },
    scissors: { rock: 0, paper: 0, scissors: 0 },
  };

  for (let i = 0; i < history.length - 1; i += 1) {
    const from = history[i];
    const to = history[i + 1];
    transitions[from][to] += 1;
  }

  const lastMove = history[history.length - 1];
  const transitionFromLast = transitions[lastMove];
  const hasTransitionData =
    transitionFromLast.rock + transitionFromLast.paper + transitionFromLast.scissors > 0;

  const predictedPlayerMove: Move = hasTransitionData
    ? (Object.entries(transitionFromLast).sort((a, b) => b[1] - a[1])[0]?.[0] || "rock") as Move
    : getMostFrequentMove(history);

  const optimalCounter = getCounterMove(predictedPlayerMove);

  // Difficulty tuning:
  // - 85% of the time: play the optimal counter (hard to beat).
  // - 10% of the time: mirror the predicted move (keeps things interesting).
  // - 5% of the time: fully random (prevents perfect predictability).
  const roll = Math.random();
  if (roll < 0.85) return optimalCounter;
  if (roll < 0.95) return predictedPlayerMove;
  return getRandomMove();
}
