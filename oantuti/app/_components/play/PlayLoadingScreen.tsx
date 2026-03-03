type PlayLoadingScreenProps = {
  status: string;
};

export function PlayLoadingScreen({ status }: PlayLoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <p className="text-slate-600">{status}</p>
    </div>
  );
}
