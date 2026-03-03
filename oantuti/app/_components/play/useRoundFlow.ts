"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Move, OpponentState, RoundResult } from "@/app/_components/types";
import { getRoundResult, pickAiMove } from "@/app/_components/game-utils";
import { playSound, SOUND_WIN, SOUND_LOSE, SOUND_DRAW } from "./sounds";

export type RoundFlowRefs = {
  setPlayerMove: (m: Move | null) => void;
  isRevealingRef: React.MutableRefObject<boolean>;
  freezeDisplayedMovesRef: React.MutableRefObject<boolean>;
  latestInferredMoveRef: React.MutableRefObject<Move | null>;
  countdownTimerRef: React.MutableRefObject<number | null>;
  resultTimerRef: React.MutableRefObject<number | null>;
};

export function useRoundFlow(setStatus: (s: string) => void) {
  const countdownTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const isRevealingRef = useRef(false);
  const freezeDisplayedMovesRef = useRef(false);
  const playerHistoryRef = useRef<Move[]>([]);
  const latestInferredMoveRef = useRef<Move | null>(null);

  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [draws, setDraws] = useState(0);
  const [opponentState, setOpponentState] = useState<OpponentState>("idle");
  const [animatedOpponentMove, setAnimatedOpponentMove] = useState<Move | null>(null);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);

  useEffect(() => {
    isRevealingRef.current = isRevealing;
  }, [isRevealing]);

  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    const doReveal = () => {
      setCountdown(null);
      const capturedPlayer: Move =
        latestInferredMoveRef.current ??
        (["rock", "paper", "scissors"] as const)[Math.floor(Math.random() * 3)];
      const opponent = pickAiMove(playerHistoryRef.current);
      const round = getRoundResult(capturedPlayer, opponent);

      playerHistoryRef.current = [...playerHistoryRef.current.slice(-5), capturedPlayer];

      setPlayerMove(capturedPlayer);
      setBotMove(opponent);
      setAnimatedOpponentMove(opponent);
      setOpponentState("reveal");
      setResult(round);

      if (round === "win") {
        setPlayerScore((p) => p + 1);
        playSound(SOUND_WIN);
      } else if (round === "lose") {
        setBotScore((p) => p + 1);
        playSound(SOUND_LOSE);
      } else {
        setDraws((p) => p + 1);
        playSound(SOUND_DRAW);
      }

      setStatus(`Round done: You ${round}!`);
      isRevealingRef.current = true;
      freezeDisplayedMovesRef.current = true;
      setIsRevealing(true);
      setRoundsCompleted((c) => c + 1);

      if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = window.setTimeout(() => {
        resultTimerRef.current = null;
        isRevealingRef.current = false;
        setIsRevealing(false);
        setOpponentState("idle");
        setStatus("Click Start for next round");
      }, 2000);
    };

    const runStep = (step: 3 | 2 | 1) => {
      freezeDisplayedMovesRef.current = false;
      setAnimatedOpponentMove("rock");
      setOpponentState("idle");
      setCountdown(step);
      setStatus(step === 3 ? "Get ready! 3..." : `${step}...`);
      if (step === 3) {
        setResult(null);
        setBotMove(null);
      }
      if (step === 1) {
        countdownTimerRef.current = window.setTimeout(doReveal, 1000);
      } else {
        countdownTimerRef.current = window.setTimeout(
          () => runStep((step - 1) as 2 | 1),
          1000,
        );
      }
    };
    runStep(3);
  }, [setStatus]);

  const canStart = Boolean(countdown === null && !isRevealing);

  const resultText = useMemo(() => {
    if (result === "win") return "You win this round! Lfgggggggg!";
    if (result === "lose") return "You lose! Boooo!";
    if (result === "draw") return "It is a draw";
    if (countdown !== null) return "Get ready!";
    if (isRevealing) return "Reveal!";
    return "Next round starting...";
  }, [result, countdown, isRevealing]);

  const opponentLabel = useMemo(() => {
    if (countdown !== null) return `${countdown}...`;
    if (opponentState === "reveal") return "Reveal!";
    return "Ready";
  }, [opponentState, countdown]);

  const refs: RoundFlowRefs = useMemo(
    () => ({
      setPlayerMove,
      isRevealingRef,
      freezeDisplayedMovesRef,
      latestInferredMoveRef,
      countdownTimerRef,
      resultTimerRef,
    }),
    [],
  );

  return {
    refs,
    startCountdown,
    canStart,
    playerMove,
    botMove,
    result,
    playerScore,
    botScore,
    draws,
    opponentState,
    animatedOpponentMove,
    countdown,
    isRevealing,
    roundsCompleted,
    resultText,
    opponentLabel,
  };
}
