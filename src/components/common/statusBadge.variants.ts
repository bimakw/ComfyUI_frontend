import type { VariantProps } from 'cva'
import { cva } from 'cva'

export const statusBadgeVariants = cva({
  base: 'inline-flex items-center justify-center rounded-full',
  variants: {
    severity: {
      default: 'bg-primary-background text-base-foreground',
      secondary: 'bg-secondary-background text-base-foreground',
      warn: 'bg-warning-background text-base-background',
      danger: 'bg-destructive-background text-white',
      contrast: 'bg-base-foreground text-base-background'
    },
    mode: {
      label: 'h-3.5 px-1 text-xxxs font-semibold uppercase',
      dot: 'size-2'
    }
  },
  defaultVariants: {
    severity: 'default',
    mode: 'label'
  }
})

export type StatusBadgeVariants = VariantProps<typeof statusBadgeVariants>
