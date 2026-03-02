type CountdownOverlayProps = {
  countdown: 3 | 2 | 1;
};

export function CountdownOverlay({ countdown }: CountdownOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <span
        className="animate-countdown-pop text-[min(25vw,180px)] font-black tabular-nums text-slate-900 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]"
        style={{ textShadow: "0 0 40px white, 0 4px 0 #0f172a" }}
      >
        {countdown}
      </span>
    </div>
  );
}
