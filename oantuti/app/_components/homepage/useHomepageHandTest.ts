"use client";

import { useEffect, useRef, useState } from "react";
import type { HandResults, Move } from "@/app/_components/types";
import { SCRIPT_URLS, inferMove, loadScript } from "@/app/_components/hand-tracking-utils";

export function useHomepageHandTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<{ stop?: () => void } | null>(null);
  const processLockRef = useRef(false);

  const [testReady, setTestReady] = useState(false);
  const [testStatus, setTestStatus] = useState("Initializing camera...");
  const [testMove, setTestMove] = useState<Move | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setTestStatus("Loading hand-tracking...");
        for (const scriptUrl of SCRIPT_URLS) {
          await loadScript(scriptUrl);
        }
        if (cancelled) return;

        if (!videoRef.current || !canvasRef.current || !window.Hands || !window.Camera) {
          setTestStatus("Camera not available");
          return;
        }

        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
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

  return { videoRef, canvasRef, testReady, testStatus, testMove };
}
