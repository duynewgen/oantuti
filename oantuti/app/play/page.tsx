"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { HandResults, Move, OpponentState, RoundResult } from "@/app/_components/types";
import { SCRIPT_URLS, inferMove, loadScript } from "@/app/_components/hand-tracking-utils";
import { getRoundResult, pickAiMove } from "@/app/_components/game-utils";
import {
  PlayHeader,
  CountdownOverlay,
  CharacterCard,
  PlayerCameraCard,
  ScoreboardSection,
} from "@/app/_components/play";

const SESSION_KEY = "oantuti-character-poses";

export default function PlayPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<{ stop?: () => void } | null>(null);
  const processLockRef = useRef(false);
  const latestInferredMoveRef = useRef<Move | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const isRevealingRef = useRef(false);
  const freezeDisplayedMovesRef = useRef(false);
  const playerHistoryRef = useRef<Move[]>([]);

  const [characterPoses, setCharacterPoses] = useState<Record<Move, string> | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [status, setStatus] = useState("Loading...");
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [draws, setDraws] = useState(0);
  const [opponentState, setOpponentState] = useState<OpponentState>("idle");
  const [animatedOpponentMove, setAnimatedOpponentMove] = useState<Move | null>(null);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);

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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("Loading camera + hand tracking...");
        for (const scriptUrl of SCRIPT_URLS) {
          await loadScript(scriptUrl);
        }
        if (!cancelled) setScriptsReady(true);
      } catch {
        if (!cancelled) setStatus("Failed to load. Check internet and refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scriptsReady || !videoRef.current || !canvasRef.current || !window.Hands || !window.Camera) {
      return;
    }
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    const hands = new window.Hands!({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results: HandResults) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      const hand = results.multiHandLandmarks?.[0];
      if (hand) {
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          window.drawConnectors(canvasCtx, hand, window.HAND_CONNECTIONS, {
            color: "#2ef2a2",
            lineWidth: 3,
          });
        }
        if (window.drawLandmarks) {
          window.drawLandmarks(canvasCtx, hand, {
            color: "#ffd166",
            lineWidth: 1,
          });
        }
        const inferred = inferMove(hand);
        if (inferred) {
          latestInferredMoveRef.current = inferred;
          if (!isRevealingRef.current && !freezeDisplayedMovesRef.current) setPlayerMove(inferred);
        } else {
          latestInferredMoveRef.current = null;
          if (!isRevealingRef.current && !freezeDisplayedMovesRef.current) setPlayerMove(null);
        }
      } else {
        latestInferredMoveRef.current = null;
        if (!isRevealingRef.current && !freezeDisplayedMovesRef.current) setPlayerMove(null);
      }
      canvasCtx.restore();
    });

    const camera = new window.Camera!(videoElement, {
      onFrame: async () => {
        if (!processLockRef.current) {
          processLockRef.current = true;
          await hands.send({ image: videoElement });
          processLockRef.current = false;
        }
      },
      width: 960,
      height: 720,
    });
    cameraRef.current = camera;
    camera.start();

    return () => {
      cameraRef.current?.stop?.();
      cameraRef.current = null;
      if (countdownTimerRef.current) window.clearTimeout(countdownTimerRef.current);
      if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);
    };
  }, [scriptsReady]);

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

      if (round === "win") setPlayerScore((p) => p + 1);
      else if (round === "lose") setBotScore((p) => p + 1);
      else setDraws((p) => p + 1);

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
  }, []);

  const canStart = Boolean(
    scriptsReady && characterPoses && countdown === null && !isRevealing
  );

  useEffect(() => {
    if (canStart && roundsCompleted === 0) {
      setStatus("Click Start to begin");
    }
  }, [canStart, roundsCompleted]);

  const resultText = useMemo(() => {
    if (result === "win") return "You win this round";
    if (result === "lose") return "Opponent wins this round";
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

  if (!characterPoses) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">{status}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef08a,_#bfdbfe_45%,_#86efac)] px-4 py-6 text-slate-900 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <PlayHeader status={status} />

        <section className="relative grid gap-5 md:grid-cols-2">
          {countdown !== null && <CountdownOverlay countdown={countdown} />}
          <CharacterCard
            characterPoses={characterPoses}
            opponentState={opponentState}
            animatedOpponentMove={animatedOpponentMove}
            opponentLabel={opponentLabel}
            botMove={botMove}
          />
          <PlayerCameraCard
            videoRef={videoRef}
            canvasRef={canvasRef}
            playerMove={playerMove}
          />
        </section>

        <ScoreboardSection
          resultText={resultText}
          playerScore={playerScore}
          botScore={botScore}
          draws={draws}
          canStart={canStart}
          roundsCompleted={roundsCompleted}
          onStartCountdown={startCountdown}
        />
      </main>
    </div>
  );
}
