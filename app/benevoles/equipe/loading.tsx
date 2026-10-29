export default function Loading() {
  return (
    <div className="min-h-screen bg-teal-50">
      <div className="px-4 md:px-6 pb-4 animate-pulse" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 16px)' }}>
        <div className="h-2.5 w-24 bg-teal/25 rounded-full mb-3" />
        <div className="h-8 w-56 bg-dark/10 rounded-xl" />
      </div>
      <div className="px-4 md:px-6 pb-6 animate-pulse">
        <div className="bg-white rounded-2xl h-96 shadow-[0_1px_4px_rgba(0,0,0,0.06)]" />
      </div>
    </div>
  )
}
