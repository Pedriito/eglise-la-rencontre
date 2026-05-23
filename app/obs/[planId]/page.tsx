import { ObsOverlay } from './ObsOverlay'

export const metadata = {
  title: 'OBS Overlay — Projection',
  robots: { index: false, follow: false },
}

export default async function ObsPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  return <ObsOverlay planId={planId} />
}
