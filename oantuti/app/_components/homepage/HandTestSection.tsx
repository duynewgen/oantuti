"use client";

import type { RefObject } from "react";
import type { Move } from "@/app/_components/types";

type HandTestSectionProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  testReady: boolean;
  testStatus: string;
  testMove: Move | null;
};

export function HandTestSection({
  videoRef,
  canvasRef,
  testReady,
  testStatus,
  testMove,
}: HandTestSectionProps) {
  return (
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
        <video ref={videoRef} className="hidden" playsInline />
        <canvas
          ref={canvasRef}
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
  );
}
