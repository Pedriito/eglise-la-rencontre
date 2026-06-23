export function StatusDot({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 font-sans text-xs font-medium shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        Confirmé
      </span>
    )
  }
  if (status === 'declined') {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 font-sans text-xs font-medium shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        Refusé
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-500 font-sans text-xs font-medium shrink-0">
      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
      En attente
    </span>
  )
}
