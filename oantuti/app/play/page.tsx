"use client";

import { useEffect, useRef, useState } from "react";
import {
  PlayHeader,
  ScoreboardSection,
  PlayLoadingScreen,
  PlayGameGrid,
} from "@/app/_components/play";
import { useCharacterPoses } from "@/app/_components/play/useCharacterPoses";
import { useMediaPipeScripts } from "@/app/_components/play/useMediaPipeScripts";
import { useRoundFlow } from "@/app/_components/play/useRoundFlow";
import { useHandTracking } from "@/app/_components/play/useHandTracking";

export default function PlayPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Loading...");

  const characterPoses = useCharacterPoses(setStatus);
  const scriptsReady = useMediaPipeScripts(setStatus);
  const round = useRoundFlow(setStatus);
  useHandTracking(scriptsReady, videoRef, canvasRef, round.refs);

  const canStart = Boolean(
    scriptsReady && characterPoses && round.canStart
  );

  useEffect(() => {
    if (canStart && round.roundsCompleted === 0) {
      setStatus("Click Start to begin");
    }
  }, [canStart, round.roundsCompleted]);

  if (!characterPoses) {
    return <PlayLoadingScreen status={status} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef08a,_#bfdbfe_45%,_#86efac)] px-4 py-6 text-slate-900 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <PlayHeader status={status} />

        <ScoreboardSection
          resultText={round.resultText}
          playerScore={round.playerScore}
          botScore={round.botScore}
          draws={round.draws}
          canStart={canStart}
          roundsCompleted={round.roundsCompleted}
          onStartCountdown={round.startCountdown}
        />

        <PlayGameGrid
          countdown={round.countdown}
          characterPoses={characterPoses}
          opponentState={round.opponentState}
          animatedOpponentMove={round.animatedOpponentMove}
          opponentLabel={round.opponentLabel}
          botMove={round.botMove}
          videoRef={videoRef}
          canvasRef={canvasRef}
          playerMove={round.playerMove}
        />
      </main>
    </div>
  );
}
