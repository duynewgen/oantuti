import type { Move, OpponentState } from "../types";
import { getSpriteStateClass } from "./sprite-utils";

type CharacterCardProps = {
  characterPoses: Record<Move, string>;
  opponentState: OpponentState;
  animatedOpponentMove: Move | null;
  opponentLabel: string;
  botMove: Move | null;
};

export function CharacterCard({
  characterPoses,
  opponentState,
  animatedOpponentMove,
  opponentLabel,
  botMove,
}: CharacterCardProps) {
  return (
    <article className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a]">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase">Left: Character</h2>
        <span className="rounded-lg border-2 border-slate-900 bg-pink-100 px-2 py-1 text-xs font-bold uppercase">
          {opponentLabel}
        </span>
      </header>
      <div className="mt-3 rounded-2xl border-2 border-slate-900 bg-[linear-gradient(135deg,#fecdd3,#dbeafe,#d9f99d)] p-4">
        <div className="relative mx-auto min-h-80 w-full overflow-hidden rounded-2xl border-2 border-slate-900 bg-[linear-gradient(180deg,#fefce8,#dbeafe_55%,#bbf7d0)]">
          <div className="absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(90deg,#86efac,#facc15,#60a5fa)] opacity-60" />
          <div className="opponent-stage">
            <div
              className={`opponent-sprite ${getSpriteStateClass(opponentState)}`}
              style={{
                backgroundImage: `url(${characterPoses[animatedOpponentMove ?? "rock"]})`,
              }}
            />
          </div>
        </div>
      </div>
      <p className="mt-4 rounded-xl border-2 border-slate-900 bg-amber-100 px-3 py-2 text-center text-sm font-bold">
        Opponent move: {botMove ?? "???"}
      </p>
    </article>
  );
}
