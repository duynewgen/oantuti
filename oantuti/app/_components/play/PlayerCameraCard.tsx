import type { Move } from "../types";
import type { RefObject } from "react";

type PlayerCameraCardProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  playerMove: Move | null;
};

export function PlayerCameraCard({ videoRef, canvasRef, playerMove }: PlayerCameraCardProps) {
  return (
    <article className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase">Right: You</h2>
        <span className="rounded-lg border-2 border-slate-900 bg-sky-100 px-2 py-1 text-xs font-bold uppercase">
          Hand tracking
        </span>
      </header>
      <div className="relative mt-3 overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-950">
        <video ref={videoRef} className="hidden" playsInline />
        <canvas
          ref={canvasRef}
          width={960}
          height={720}
          className="aspect-video w-full -scale-x-100 object-cover"
        />
      </div>
      <p className="mt-4 rounded-xl border-2 border-slate-900 bg-cyan-100 px-3 py-2 text-center text-sm font-bold">
        Your move: {playerMove ? playerMove : "waiting"}
      </p>
    </article>
  );
}
