<script setup lang="ts">
type Severity = 'default' | 'secondary' | 'warn' | 'danger' | 'contrast'

const { label, severity = 'default' } = defineProps<{
  label?: string | number
  severity?: Severity
}>()

function badgeClasses(sev: Severity, hasLabel: boolean): string {
  if (!hasLabel) {
    const dotBase = 'inline-block size-2 rounded-full'
    switch (sev) {
      case 'danger':
        return `${dotBase} bg-destructive-background`
      case 'contrast':
        return `${dotBase} bg-base-foreground`
      case 'warn':
        return `${dotBase} bg-warning-background`
      case 'secondary':
        return `${dotBase} bg-secondary-background`
      default:
        return `${dotBase} bg-primary-background`
    }
  }

  const baseClasses =
    'inline-flex h-3.5 items-center justify-center rounded-full px-1 text-xxxs font-semibold uppercase'

  switch (sev) {
    case 'danger':
      return `${baseClasses} bg-destructive-background text-white`
    case 'contrast':
      return `${baseClasses} bg-base-foreground text-base-background`
    case 'warn':
      return `${baseClasses} bg-warning-background text-base-background`
    case 'secondary':
      return `${baseClasses} bg-secondary-background text-base-foreground`
    default:
      return `${baseClasses} bg-primary-background text-base-foreground`
  }
}
</script>

<template>
  <span :class="badgeClasses(severity, label != null)">{{ label }}</span>
</template>
