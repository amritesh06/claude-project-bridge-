export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-8 text-center">
      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-muted">
          <Icon size={18} />
        </div>
      )}
      <p className="text-[13px] font-medium">{title}</p>
      {description && <p className="max-w-[260px] text-[12px] text-muted">{description}</p>}
      {action}
    </div>
  );
}
