import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

export type FieldSurface = 'sand' | 'tealSoft' | 'plain'
export type FieldSize = 'sm' | 'md'

export type FieldStyleOptions = {
  /** `sand` fond sable, `tealSoft` fond teal très clair, `plain` fond blanc.
   *  Les trois existaient déjà dans l'application ; le choix suit l'écran. */
  surface?: FieldSurface
  size?: FieldSize
  invalid?: boolean
  className?: string
}

const SURFACES: Record<FieldSurface, string> = {
  sand: 'border border-dark/10 bg-sand',
  tealSoft: 'border border-teal/30 bg-teal-50',
  plain: 'border border-teal/20 bg-white',
}

/** `text-base` sur mobile n'est pas un choix esthétique : sous 16px, iOS zoome
 *  automatiquement à la prise de focus. La taille réduite ne s'applique donc
 *  qu'à partir de `sm`, où il n'y a pas d'écran tactile étroit. */
const SIZES: Record<FieldSize, string> = {
  sm: 'px-3 py-2 text-base sm:text-xs',
  md: 'px-3.5 py-2.5 text-base sm:text-sm',
}

export function fieldClasses({ surface = 'tealSoft', size = 'md', invalid = false, className }: FieldStyleOptions = {}): string {
  return cx(
    'w-full rounded-xl text-dark font-sans placeholder:text-dark/30 transition-colors',
    'focus:outline-none focus:ring-2',
    invalid ? 'border-red-300 focus:ring-red-200' : 'focus:ring-teal/30',
    'disabled:opacity-60 disabled:pointer-events-none',
    SURFACES[surface],
    SIZES[size],
    className,
  )
}

export type TextFieldProps = FieldStyleOptions & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'>

export function TextField({ surface, size, invalid, className, ...rest }: TextFieldProps) {
  return <input className={fieldClasses({ surface, size, invalid, className })} aria-invalid={invalid || undefined} {...rest} />
}

export type TextareaProps = FieldStyleOptions & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

export function Textarea({ surface, size, invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={fieldClasses({ surface, size, invalid, className: cx('resize-none', className) })}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

export type SelectProps = FieldStyleOptions & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'size'>

export function Select({ surface, size, invalid, className, children, ...rest }: SelectProps) {
  return (
    <select className={fieldClasses({ surface, size, invalid, className })} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  )
}

export type FieldLabelVariant = 'caps' | 'sentence'

export type FieldLabelProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'className'> & {
  /** `caps` majuscules espacées, la variante dominante ; `sentence` pour les
   *  formulaires longs où les majuscules deviennent fatigantes à lire. */
  variant?: FieldLabelVariant
  className?: string
  children?: ReactNode
}

const LABELS: Record<FieldLabelVariant, string> = {
  caps: 'font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold',
  sentence: 'font-sans text-sm text-dark/70',
}

export function FieldLabel({ variant = 'caps', className, children, ...rest }: FieldLabelProps) {
  return (
    <label className={cx('block mb-1.5', LABELS[variant], className)} {...rest}>
      {children}
    </label>
  )
}

export function HelperText({ className, children }: { className?: string; children?: ReactNode }) {
  return <p className={cx('font-sans text-[10px] text-dark/40', className)}>{children}</p>
}

export function ErrorText({ className, children }: { className?: string; children?: ReactNode }) {
  return <p role="alert" className={cx('font-sans text-xs text-red-500', className)}>{children}</p>
}
