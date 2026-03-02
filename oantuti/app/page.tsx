"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Move = "rock" | "paper" | "scissors";
type RoundResult = "win" | "lose" | "draw";

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

const MOVE_EMOJI: Record<Move, string> = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
};

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

function randomMove(): Move {
  const choices: Move[] = ["rock", "paper", "scissors"];
  return choices[Math.floor(Math.random() * choices.length)];
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

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<{ stop?: () => void } | null>(null);
  const processLockRef = useRef(false);
  const stableCountRef = useRef(0);
  const stableMoveRef = useRef<Move | null>(null);
  const roundLockRef = useRef(false);

  const [scriptsReady, setScriptsReady] = useState(false);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [status, setStatus] = useState("Loading computer vision models...");
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [draws, setDraws] = useState(0);
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);

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
          setStatus("Failed to load computer vision scripts. Check your internet and refresh.");
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
      console.error("Could not access canvas context.");
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
          setStatus(`Detected: ${inferred}. Hold steady to lock in move...`);
          setPlayerMove(inferred);

          if (stableMoveRef.current === inferred) {
            stableCountRef.current += 1;
          } else {
            stableMoveRef.current = inferred;
            stableCountRef.current = 1;
          }

          if (stableCountRef.current >= 12 && !roundLockRef.current) {
            roundLockRef.current = true;
            const opponent = randomMove();
            const round = getRoundResult(inferred, opponent);

            setBotMove(opponent);
            setResult(round);

            if (round === "win") {
              setPlayerScore((prev) => prev + 1);
            } else if (round === "lose") {
              setBotScore((prev) => prev + 1);
            } else {
              setDraws((prev) => prev + 1);
            }

            setStatus(`Round done: You ${round}. Show a new hand sign for next round.`);

            window.setTimeout(() => {
              stableCountRef.current = 0;
              stableMoveRef.current = null;
              roundLockRef.current = false;
            }, 1300);
          }
        } else {
          stableCountRef.current = 0;
          stableMoveRef.current = null;
          setStatus("Hand found. Show a clear Rock, Paper, or Scissors sign.");
        }
      } else {
        setPlayerMove(null);
        stableCountRef.current = 0;
        stableMoveRef.current = null;
        setStatus("No hand detected. Move your hand into camera view.");
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
    };
  }, [scriptsReady]);

  const resultText = useMemo(() => {
    if (!result) {
      return "Waiting for first round...";
    }

    if (result === "win") {
      return "You win this round";
    }

    if (result === "lose") {
      return "Cartoon wins this round";
    }

    return "It is a draw";
  }, [result]);

  const onCartoonUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCartoonImage(objectUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-sky-100 to-lime-100 px-4 py-8 text-slate-900 md:px-8">
      <main className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-3xl border-4 border-slate-900 bg-white shadow-[10px_10px_0_#0f172a]">
          <div className="border-b-4 border-slate-900 bg-yellow-300 p-4">
            <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl">Cartoon RPS Arena</h1>
            <p className="mt-1 text-sm font-semibold md:text-base">Show your hand sign to the camera and battle your uploaded cartoon.</p>
          </div>

          <div className="relative bg-slate-950">
            <video ref={videoRef} className="hidden" playsInline />
            <canvas ref={canvasRef} width={960} height={720} className="aspect-video w-full object-cover" />

            <div className="absolute left-3 top-3 rounded-xl border-2 border-slate-900 bg-white/90 px-3 py-1 text-xs font-bold uppercase md:text-sm">
              {scriptsReady ? "camera on" : "camera off"}
            </div>

            <div className="absolute bottom-3 left-3 right-3 rounded-2xl border-2 border-slate-900 bg-white/95 p-3 text-xs font-semibold md:text-sm">
              {status}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
            <h2 className="text-lg font-black uppercase">1. Upload Cartoon</h2>
            <p className="mt-2 text-sm font-medium text-slate-700">Use any image: Tom, Jerry, Phineas, Ferb, or your own drawing.</p>
            <input
              type="file"
              accept="image/*"
              onChange={onCartoonUpload}
              className="mt-3 block w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-3 overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-100">
              {cartoonImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cartoonImage} alt="Uploaded cartoon opponent" className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
                  Upload a character image to spawn your opponent.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
            <h2 className="text-lg font-black uppercase">2. Live Round</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-slate-900 bg-sky-100 p-3 text-center">
                <p className="text-xs font-bold uppercase">You</p>
                <p className="mt-2 text-4xl">{playerMove ? MOVE_EMOJI[playerMove] : "❔"}</p>
                <p className="mt-1 text-sm font-semibold capitalize">{playerMove ?? "waiting"}</p>
              </div>
              <div className="rounded-2xl border-2 border-slate-900 bg-pink-100 p-3 text-center">
                <p className="text-xs font-bold uppercase">Cartoon</p>
                <p className="mt-2 text-4xl">{botMove ? MOVE_EMOJI[botMove] : "🎲"}</p>
                <p className="mt-1 text-sm font-semibold capitalize">{botMove ?? "not played"}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl border-2 border-slate-900 bg-lime-200 px-3 py-2 text-center text-sm font-bold">{resultText}</p>
          </section>

          <section className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
            <h2 className="text-lg font-black uppercase">Scoreboard</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border-2 border-slate-900 bg-sky-100 p-2">
                <p className="text-xs font-bold uppercase">You</p>
                <p className="text-2xl font-black">{playerScore}</p>
              </div>
              <div className="rounded-xl border-2 border-slate-900 bg-pink-100 p-2">
                <p className="text-xs font-bold uppercase">Cartoon</p>
                <p className="text-2xl font-black">{botScore}</p>
              </div>
              <div className="rounded-xl border-2 border-slate-900 bg-zinc-100 p-2">
                <p className="text-xs font-bold uppercase">Draw</p>
                <p className="text-2xl font-black">{draws}</p>
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
