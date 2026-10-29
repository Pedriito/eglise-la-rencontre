import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PlanningViewToggle } from './PlanningViewToggle'

afterEach(cleanup)

describe('PlanningViewToggle', () => {
  it('propose la vue « Par équipe » à côté de Liste et Calendrier quand elle est autorisée', () => {
    render(<PlanningViewToggle current="list" showTeam />)
    expect(screen.getByRole('link', { name: /Liste/ })).toHaveAttribute('href', '/benevoles/admin/plans?view=list')
    expect(screen.getByRole('link', { name: /Calendrier/ })).toHaveAttribute('href', '/benevoles/admin/plans?view=calendar')
    expect(screen.getByRole('link', { name: /Par équipe/ })).toHaveAttribute('href', '/benevoles/equipe')
  })

  it('masque « Par équipe » aux bénévoles sans droit de planification', () => {
    render(<PlanningViewToggle current="list" showTeam={false} />)
    expect(screen.queryByRole('link', { name: /Par équipe/ })).toBeNull()
  })

  it('marque la vue équipe comme page courante', () => {
    render(<PlanningViewToggle current="team" showTeam />)
    expect(screen.getByRole('link', { name: /Par équipe/ })).toHaveAttribute('aria-current', 'page')
  })
})
