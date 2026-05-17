export function StatusDot({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <span
        title="Confirmé"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white font-bold shrink-0"
        style={{ fontSize: 11 }}
      >
        ✓
      </span>
    )
  }
  if (status === 'declined') {
    return (
      <span
        title="Refusé"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white font-bold shrink-0"
        style={{ fontSize: 11 }}
      >
        ✕
      </span>
    )
  }
  return (
    <span
      title="En attente de réponse"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white font-bold shrink-0"
      style={{ fontSize: 11 }}
    >
      ?
    </span>
  )
}
