import Link from "next/link";

type PlayHeaderProps = {
  status: string;
};

export function PlayHeader({ status }: PlayHeaderProps) {
  return (
    <section className="flex items-center justify-between rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[8px_8px_0_#0f172a] md:p-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl">
          OANTUTI — Play
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-700">{status}</p>
      </div>
      <Link
        href="/"
        className="rounded-xl border-2 border-slate-900 bg-slate-100 px-4 py-2 text-sm font-bold uppercase hover:bg-slate-200"
      >
        ← Home
      </Link>
    </section>
  );
}
