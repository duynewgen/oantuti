"use client";

import { useEffect, useRef } from "react";
import type { HandResults, Move } from "@/app/_components/types";
import { inferMove } from "@/app/_components/hand-tracking-utils";
import type { RoundFlowRefs } from "./useRoundFlow";

export function useHandTracking(
  scriptsReady: boolean,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  roundRefs: RoundFlowRefs,
) {
  const cameraRef = useRef<{ stop?: () => void } | null>(null);
  const processLockRef = useRef(false);

  useEffect(() => {
    if (!scriptsReady || !videoRef.current || !canvasRef.current || !window.Hands || !window.Camera) {
      return;
    }
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    const { setPlayerMove, isRevealingRef, freezeDisplayedMovesRef, latestInferredMoveRef } = roundRefs;

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
      if (roundRefs.countdownTimerRef.current) {
        window.clearTimeout(roundRefs.countdownTimerRef.current);
      }
      if (roundRefs.resultTimerRef.current) {
        window.clearTimeout(roundRefs.resultTimerRef.current);
      }
    };
  }, [scriptsReady, videoRef, canvasRef, roundRefs]);
}
