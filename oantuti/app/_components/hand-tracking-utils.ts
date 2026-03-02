import type { Landmark, Move } from "./types";

export const SCRIPT_URLS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
];

function getFingerUp(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y < landmarks[pip].y;
}

export function inferMove(landmarks: Landmark[]): Move | null {
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

export function loadScript(src: string): Promise<void> {
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
