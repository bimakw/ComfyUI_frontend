<script setup lang="ts">
import { statusBadgeVariants } from './statusBadge.variants';
import type { StatusBadgeVariants } from './statusBadge.variants';

const { label, severity = 'default' } = defineProps<{
  label?: string | number
  severity?: StatusBadgeVariants['severity']
}>()
</script>

<template>
  <span
    :class="
      statusBadgeVariants({ severity, mode: label != null ? 'label' : 'dot' })
    "
  >
    {{ label }}
  </span>
</template>
