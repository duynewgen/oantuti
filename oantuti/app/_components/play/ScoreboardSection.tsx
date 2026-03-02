type ScoreboardSectionProps = {
  resultText: string;
  playerScore: number;
  botScore: number;
  draws: number;
  canStart: boolean;
  roundsCompleted: number;
  onStartCountdown: () => void;
};

export function ScoreboardSection({
  resultText,
  playerScore,
  botScore,
  draws,
  canStart,
  roundsCompleted,
  onStartCountdown,
}: ScoreboardSectionProps) {
  return (
    <section className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-black uppercase">Round + Scoreboard (Volume up for some fun stuff)</h2>
        {canStart && (
          <button
            type="button"
            onClick={onStartCountdown}
            className="rounded-xl border-2 border-slate-900 bg-emerald-500 px-6 py-3 font-bold uppercase text-white shadow-[4px_4px_0_#0f172a] transition hover:bg-emerald-600 hover:shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {roundsCompleted === 0 ? "Start" : "Next round"}
          </button>
        )}
      </div>
      <p className="mt-3 rounded-xl border-2 border-slate-900 bg-lime-200 px-3 py-2 text-center text-sm font-bold md:text-base">
        {resultText}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border-2 border-slate-900 bg-pink-100 p-2">
          <p className="text-xs font-bold uppercase">Character</p>
          <p className="text-2xl font-black">{botScore}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-900 bg-zinc-100 p-2">
          <p className="text-xs font-bold uppercase">Draw</p>
          <p className="text-2xl font-black">{draws}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-900 bg-sky-100 p-2">
          <p className="text-xs font-bold uppercase">You</p>
          <p className="text-2xl font-black">{playerScore}</p>
        </div>
      </div>
    </section>
  );
}
