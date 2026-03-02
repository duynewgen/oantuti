"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Move = "rock" | "paper" | "scissors";
type CharacterPoses = Record<Move, string>;

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

const SESSION_KEY = "oantuti-character-poses";

function getFingerUp(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y < landmarks[pip].y;
}

function inferMove(landmarks: Landmark[]): Move | null {
  if (landmarks.length < 21) return null;
  const indexUp = getFingerUp(landmarks, 8, 6);
  const middleUp = getFingerUp(landmarks, 12, 10);
  const ringUp = getFingerUp(landmarks, 16, 14);
  const pinkyUp = getFingerUp(landmarks, 20, 18);
  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
  if (extendedCount <= 1) return "rock";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "scissors";
  if (extendedCount >= 3) return "paper";
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

export default function HomePage() {
  const fileUrlRef = useRef<string | null>(null);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const testCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<{ stop?: () => void } | null>(null);
  const processLockRef = useRef(false);

  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [characterPoses, setCharacterPoses] = useState<CharacterPoses | null>(null);
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [testReady, setTestReady] = useState(false);
  const [testMove, setTestMove] = useState<Move | null>(null);
  const [testStatus, setTestStatus] = useState("Initializing camera...");

  const onImageUpload = useCallback(
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

        const poses = (await res.json()) as CharacterPoses;
        setCharacterPoses(poses);
        setGenerationStatus("ready");
      } catch (err) {
        setGenerationStatus("error");
        setGenerationError(
          err instanceof Error ? err.message : "Failed to generate character poses"
        );
      }
    },
    []
  );

  const handleStartGame = useCallback(() => {
    if (!characterPoses) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(characterPoses));
    }
  }, [characterPoses]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setTestStatus("Loading hand-tracking...");
        for (const scriptUrl of SCRIPT_URLS) {
          await loadScript(scriptUrl);
        }
        if (cancelled) return;

        if (!testVideoRef.current || !testCanvasRef.current || !window.Hands || !window.Camera) {
          setTestStatus("Camera not available");
          return;
        }

        const videoElement = testVideoRef.current;
        const canvasElement = testCanvasRef.current;
        const canvasCtx = canvasElement.getContext("2d");
        if (!canvasCtx) {
          setTestStatus("Unable to start camera");
          return;
        }

        const hands = new window.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
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
            setTestMove(inferred);
          } else {
            setTestMove(null);
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
        setTestReady(true);
        setTestStatus("Raise rock, paper, scissors to test");
      } catch {
        if (!cancelled) {
          setTestStatus("Failed to start camera. Check permissions.");
        }
      }
    })();

    return () => {
      cancelled = true;
      cameraRef.current?.stop?.();
      cameraRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#fef08a,_#bfdbfe_45%,_#86efac)] px-4 py-6 text-slate-900 md:px-8">
      <main className="w-full max-w-5xl">
        <section className="w-full rounded-3xl border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0_#0f172a] md:p-8">
          <h1 className="text-center text-2xl font-black uppercase tracking-wide md:text-3xl">
            Oantuti - Rock, Paper, Scissors
          </h1>
          <p className="mt-2 text-center text-sm font-semibold text-slate-700 md:text-base">
            Upload an image of your fav cartoon character (with hands please), then wait until your
            character is ready to battle with you!
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-600">
                  Upload your character
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  disabled={generationStatus === "generating"}
                  className="mt-3 block w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-3 text-sm file:mr-4 file:rounded-lg file:border-2 file:border-slate-900 file:bg-emerald-100 file:px-4 file:py-2 file:font-bold file:text-slate-900 hover:file:bg-emerald-200 disabled:opacity-50"
                />
              </div>

              <div className="relative min-h-[280px] overflow-hidden rounded-2xl border-2 border-slate-900 bg-[linear-gradient(135deg,#fecdd3,#dbeafe,#d9f99d)]">
                {cartoonImage ? (
                  <>
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-6">
                      <div
                        className="h-48 w-40 shrink-0 rounded-2xl border-4 border-slate-900 bg-cover bg-center shadow-lg"
                        style={{
                          backgroundImage: `url(${
                            characterPoses ? characterPoses.rock : cartoonImage
                          })`,
                        }}
                      />
                      {generationStatus === "generating" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/80 text-white">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                          <p className="text-sm font-bold">
                            AI animating character&apos;s hands...
                          </p>
                          <p className="text-xs opacity-80">
                            Generating rock, paper, scissors poses
                          </p>
                          <p className="text-xs opacity-60">
                            This may take 30–60 seconds
                          </p>
                        </div>
                      )}
                      {generationStatus === "error" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-red-900/90 p-6 text-white">
                          <p className="text-sm font-bold">Generation failed</p>
                          <p className="text-center text-xs opacity-90">{generationError}</p>
                          <p className="text-center text-xs opacity-70">
                            Add FAL_KEY to .env.local to enable AI generation.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                    <div className="rounded-full border-2 border-dashed border-slate-400 p-8">
                      <svg
                        className="mx-auto h-12 w-12 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                        />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-600">
                      Upload a character image
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      AI will animate its hands for rock, paper, scissors
                    </p>
                  </div>
                )}
              </div>

              {generationStatus === "ready" && characterPoses && (
                <Link
                  href="/play"
                  onClick={handleStartGame}
                  className="block w-full rounded-xl border-2 border-slate-900 bg-emerald-500 px-6 py-4 text-center font-bold uppercase text-white shadow-[4px_4px_0_#0f172a] transition hover:bg-emerald-600 hover:shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Play game
                </Link>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border-2 border-slate-900 bg-sky-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-slate-600">
                  Test your hand gesture
                </p>
                <span className="rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-[10px] font-bold uppercase">
                  {testReady ? "Live" : "Setting up"}
                </span>
              </div>
              <div className="relative overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-950">
                <video ref={testVideoRef} className="hidden" playsInline />
                <canvas
                  ref={testCanvasRef}
                  width={960}
                  height={720}
                  className="aspect-video w-full -scale-x-100 object-cover"
                />
              </div>
              <p className="rounded-xl border-2 border-slate-900 bg-cyan-100 px-3 py-2 text-center text-xs font-bold">
                {testStatus}
              </p>
              <p className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-center text-sm font-bold">
                Detected move: {testMove ?? "none"}
              </p>
              <p className="text-[11px] text-slate-600">
                Raise your hand close to the camera and try{" "}
                <span className="font-semibold">rock</span>,{" "}
                <span className="font-semibold">paper</span>, or{" "}
                <span className="font-semibold">scissors</span> to see how the game will read your
                move.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
