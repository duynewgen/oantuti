"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Move = "rock" | "paper" | "scissors";
type RoundResult = "win" | "lose" | "draw";
type OpponentState = "idle" | "thinking" | "reveal";

type Landmark = {
  x: number;
  y: number;
  z?: number;
};

type HandResults = {
  multiHandLandmarks?: Landmark[][];
  image: CanvasImageSource;
};

declare global {
  interface Window {
    Hands?: new (config: { locateFile: (file: string) => string }) => {
      setOptions: (options: Record<string, unknown>) => void;
      onResults: (callback: (results: HandResults) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
    };
    Camera?: new (
      video: HTMLVideoElement,
      options: {
        onFrame: () => Promise<void>;
        width: number;
        height: number;
      },
    ) => {
      start: () => void;
      stop?: () => void;
    };
    drawConnectors?: (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      connections: unknown,
      options: { color: string; lineWidth: number },
    ) => void;
    drawLandmarks?: (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      options: { color: string; lineWidth: number },
    ) => void;
    HAND_CONNECTIONS?: unknown;
  }
}

const SCRIPT_URLS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
];

function getRoundResult(player: Move, bot: Move): RoundResult {
  if (player === bot) {
    return "draw";
  }

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
  if (move === "rock") {
    return "paper";
  }

  if (move === "paper") {
    return "scissors";
  }

  return "rock";
}

function pickAiMove(history: Move[]): Move {
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

  if (Math.random() < 0.7) {
    return getCounterMove(predictedPlayer);
  }

  return fallback[Math.floor(Math.random() * fallback.length)];
}

function getFingerUp(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y < landmarks[pip].y;
}

function inferMove(landmarks: Landmark[]): Move | null {
  if (landmarks.length < 21) {
    return null;
  }

  const indexUp = getFingerUp(landmarks, 8, 6);
  const middleUp = getFingerUp(landmarks, 12, 10);
  const ringUp = getFingerUp(landmarks, 16, 14);
  const pinkyUp = getFingerUp(landmarks, 20, 18);

  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  if (extendedCount <= 1) {
    return "rock";
  }

  if (indexUp && middleUp && !ringUp && !pinkyUp) {
    return "scissors";
  }

  if (extendedCount >= 3) {
    return "paper";
  }

  return null;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function getSpriteStateClass(state: OpponentState): string {
  if (state === "thinking") {
    return "opponent-sprite-thinking";
  }
  if (state === "reveal") {
    return "opponent-sprite-reveal";
  }
  return "opponent-sprite-idle";
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<{ stop?: () => void } | null>(null);
  const processLockRef = useRef(false);
  const latestInferredMoveRef = useRef<Move | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const isRevealingRef = useRef(false);
  const freezeDisplayedMovesRef = useRef(false);
  const fileUrlRef = useRef<string | null>(null);
  const playerHistoryRef = useRef<Move[]>([]);

  const [scriptsReady, setScriptsReady] = useState(false);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [status, setStatus] = useState("Loading computer vision models...");
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [draws, setDraws] = useState(0);
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [characterPoses, setCharacterPoses] = useState<Record<Move, string> | null>(null);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [opponentState, setOpponentState] = useState<OpponentState>("idle");
  const [animatedOpponentMove, setAnimatedOpponentMove] = useState<Move | null>(null);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("Loading camera + hand tracking scripts...");
        for (const scriptUrl of SCRIPT_URLS) {
          await loadScript(scriptUrl);
        }
        if (!cancelled) {
          setScriptsReady(true);
          setStatus("Scripts loaded. Starting camera...");
        }
      } catch {
        if (!cancelled) {
          setStatus("Failed to load CV scripts. Check internet and refresh.");
        }
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

    if (!canvasCtx) {
      return;
    }

    const hands = new window.Hands({
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

    const camera = new window.Camera(videoElement, {
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
      if (countdownTimerRef.current) {
        window.clearTimeout(countdownTimerRef.current);
      }
      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
      }
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
        latestInferredMoveRef.current ?? (["rock", "paper", "scissors"] as const)[Math.floor(Math.random() * 3)];
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
      if (step === 3) setResult(null);
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

  const canStart = scriptsReady && cartoonImage && countdown === null && !isRevealing;

  useEffect(() => {
    if (canStart && roundsCompleted === 0) {
      setStatus("Click Start to begin");
    }
  }, [canStart, roundsCompleted]);

  const resultText = useMemo(() => {
    if (result === "win") {
      return "You win this round";
    }
    if (result === "lose") {
      return "Opponent wins this round";
    }
    if (result === "draw") {
      return "It is a draw";
    }
    if (countdown !== null) {
      return "Get ready!";
    }
    if (isRevealing) {
      return "Reveal!";
    }
    return "Next round starting...";
  }, [result, countdown, isRevealing]);

  const opponentLabel = useMemo(() => {
    if (countdown !== null) {
      return `${countdown}...`;
    }
    if (opponentState === "reveal") {
      return "Reveal!";
    }
    return "Ready";
  }, [opponentState, countdown]);

  const onCartoonUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
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
      setRoundsCompleted(0);

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

        const poses = (await res.json()) as Record<Move, string>;
        setCharacterPoses(poses);
        setGenerationStatus("ready");
      } catch (err) {
        setGenerationStatus("error");
        setGenerationError(err instanceof Error ? err.message : "Failed to generate character poses");
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef08a,_#bfdbfe_45%,_#86efac)] px-4 py-6 text-slate-900 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <section className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a] md:p-6">
          <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl">OANTUTI - Rock, Paper, Scissors</h1>
          <p className="mt-1 text-sm font-semibold text-slate-700 md:text-base">
            Upload a character (e.g. Tom). AI animates its hands to play rock, paper, scissors.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase">Upload character</p>
              <input
                type="file"
                accept="image/*"
                onChange={onCartoonUpload}
                className="mt-2 block w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="rounded-2xl border-2 border-slate-900 bg-lime-100 p-3">
              <p className="text-xs font-bold uppercase">Live status</p>
              <p className="mt-2 text-sm font-bold md:text-base">{status}</p>
              {canStart && (
                <button
                  type="button"
                  onClick={startCountdown}
                  className="mt-3 w-full rounded-xl border-2 border-slate-900 bg-emerald-500 px-4 py-3 font-bold uppercase text-white shadow-[4px_4px_0_#0f172a] transition hover:bg-emerald-600 hover:shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  {roundsCompleted === 0 ? "Start" : "Next round"}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="relative grid gap-5 md:grid-cols-2">
          {countdown !== null && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span
                className="animate-countdown-pop text-[min(25vw,180px)] font-black tabular-nums text-slate-900 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]"
                style={{ textShadow: "0 0 40px white, 0 4px 0 #0f172a" }}
              >
                {countdown}
              </span>
            </div>
          )}
          <article className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase">Left: Character</h2>
              <span className="rounded-lg border-2 border-slate-900 bg-pink-100 px-2 py-1 text-xs font-bold uppercase">
                {opponentLabel}
              </span>
            </header>

            <div className="mt-3 rounded-2xl border-2 border-slate-900 bg-[linear-gradient(135deg,#fecdd3,#dbeafe,#d9f99d)] p-4">
              <div className="relative mx-auto h-72 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-slate-900 bg-[linear-gradient(180deg,#fefce8,#dbeafe_55%,#bbf7d0)]">
                <div className="absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(90deg,#86efac,#facc15,#60a5fa)] opacity-60" />

                {cartoonImage ? (
                  <div className="opponent-stage">
                    <div
                      className={`opponent-sprite ${getSpriteStateClass(opponentState)}`}
                      style={{
                        backgroundImage: `url(${
                          characterPoses
                            ? characterPoses[animatedOpponentMove ?? "rock"]
                            : cartoonImage
                        })`,
                      }}
                    />
                    {generationStatus === "generating" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900/70 text-white">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                        <p className="text-sm font-bold">AI animating character&apos;s hands...</p>
                        <p className="text-xs opacity-80">Generating rock, paper, scissors poses</p>
                      </div>
                    )}
                    {generationStatus === "error" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-red-900/80 p-4 text-white">
                        <p className="text-sm font-bold">Generation failed</p>
                        <p className="text-xs text-center opacity-90">{generationError}</p>
                        <p className="text-xs opacity-70">Showing original image. Add FAL_KEY to .env.local to enable AI.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-slate-600">
                    Upload a character image. AI will animate its hands for rock, paper, scissors.
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 rounded-xl border-2 border-slate-900 bg-amber-100 px-3 py-2 text-center text-sm font-bold">
              Opponent move: {botMove ? botMove : "not played"}
            </p>
          </article>

          <article className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase">Right: You</h2>
              <span className="rounded-lg border-2 border-slate-900 bg-sky-100 px-2 py-1 text-xs font-bold uppercase">
                Hand tracking
              </span>
            </header>

            <div className="relative mt-3 overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-950">
              <video ref={videoRef} className="hidden" playsInline />
              <canvas ref={canvasRef} width={960} height={720} className="aspect-video w-full object-cover" />
            </div>

            <p className="mt-4 rounded-xl border-2 border-slate-900 bg-cyan-100 px-3 py-2 text-center text-sm font-bold">
              Your move: {playerMove ? playerMove : "waiting"}
            </p>
          </article>
        </section>

        <section className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
          <h2 className="text-lg font-black uppercase">Round + Scoreboard</h2>
          <p className="mt-3 rounded-xl border-2 border-slate-900 bg-lime-200 px-3 py-2 text-center text-sm font-bold md:text-base">
            {resultText}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border-2 border-slate-900 bg-sky-100 p-2">
              <p className="text-xs font-bold uppercase">You</p>
              <p className="text-2xl font-black">{playerScore}</p>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-pink-100 p-2">
              <p className="text-xs font-bold uppercase">Character</p>
              <p className="text-2xl font-black">{botScore}</p>
            </div>
            <div className="rounded-xl border-2 border-slate-900 bg-zinc-100 p-2">
              <p className="text-xs font-bold uppercase">Draw</p>
              <p className="text-2xl font-black">{draws}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
