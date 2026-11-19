export default function Stat({ value, label, dot }) {
  return (
    <div className="rounded-lg bg-surface2 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[15px] font-semibold leading-none tabular-nums">{value}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}
