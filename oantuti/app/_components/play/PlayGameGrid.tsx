import type { RefObject } from "react";
import type { Move, OpponentState } from "@/app/_components/types";
import { CountdownOverlay } from "./CountdownOverlay";
import { CharacterCard } from "./CharacterCard";
import { PlayerCameraCard } from "./PlayerCameraCard";

type PlayGameGridProps = {
  countdown: 3 | 2 | 1 | null;
  characterPoses: Record<Move, string>;
  opponentState: OpponentState;
  animatedOpponentMove: Move | null;
  opponentLabel: string;
  botMove: Move | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  playerMove: Move | null;
};

export function PlayGameGrid({
  countdown,
  characterPoses,
  opponentState,
  animatedOpponentMove,
  opponentLabel,
  botMove,
  videoRef,
  canvasRef,
  playerMove,
}: PlayGameGridProps) {
  return (
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
  );
}
