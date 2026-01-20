import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { useAssetBrowser } from '@/platform/assets/composables/useAssetBrowser'
import type { AssetItem } from '@/platform/assets/schemas/assetSchema'

vi.mock('@/i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'assetBrowser.allModels': 'All Models',
      'assetBrowser.imported': 'Imported',
      'assetBrowser.byType': 'By type',
      'assetBrowser.assets': 'Assets',
      'assetBrowser.unknown': 'unknown'
    }
    return translations[key] || key
  },
  d: (date: Date) => date.toLocaleDateString()
}))

describe('useAssetBrowser', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Test fixtures - minimal data focused on functionality being tested
  const createApiAsset = (overrides: Partial<AssetItem> = {}): AssetItem => ({
    id: 'test-id',
    name: 'test-asset.safetensors',
    asset_hash: 'blake3:abc123',
    size: 1024,
    mime_type: 'application/octet-stream',
    tags: ['models', 'checkpoints'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_access_time: '2024-01-01T00:00:00Z',
    ...overrides
  })

  describe('Category Filtering', () => {
    it('exposes category-filtered assets for filter options', () => {
      const checkpointAsset = createApiAsset({
        id: 'checkpoint-1',
        name: 'model.safetensors',
        tags: ['models', 'checkpoints']
      })
      const loraAsset = createApiAsset({
        id: 'lora-1',
        name: 'lora.pt',
        tags: ['models', 'loras']
      })

      const { selectedNavItem, categoryFilteredAssets } = useAssetBrowser(
        ref([checkpointAsset, loraAsset])
      )

      // Initially should show all assets
      expect(categoryFilteredAssets.value).toHaveLength(2)

      // When category selected, should only show that category
      selectedNavItem.value = 'checkpoints'
      expect(categoryFilteredAssets.value).toHaveLength(1)
      expect(categoryFilteredAssets.value[0].id).toBe('checkpoint-1')

      selectedNavItem.value = 'loras'
      expect(categoryFilteredAssets.value).toHaveLength(1)
      expect(categoryFilteredAssets.value[0].id).toBe('lora-1')
    })
  })

  describe('Asset Transformation', () => {
    it('transforms API asset to include display properties', () => {
      const apiAsset = createApiAsset({
        user_metadata: { description: 'Test model' }
      })

      const { filteredAssets } = useAssetBrowser(ref([apiAsset]))
      const result = filteredAssets.value[0] // Get the transformed asset from filteredAssets

      // Preserves API properties
      expect(result.id).toBe(apiAsset.id)
      expect(result.name).toBe(apiAsset.name)

      // Adds display properties
      expect(result.description).toBe('Test model')
      expect(result.badges).toContainEqual({
        label: 'checkpoints',
        type: 'type'
      })
    })

    it('creates fallback description from tags when metadata missing', () => {
      const apiAsset = createApiAsset({
        tags: ['models', 'loras'],
        user_metadata: undefined
      })

      const { filteredAssets } = useAssetBrowser(ref([apiAsset]))
      const result = filteredAssets.value[0]

      expect(result.description).toBe('loras model')
    })

    it('removes category prefix from badge labels', () => {
      const apiAsset = createApiAsset({
        tags: ['models', 'checkpoint/stable-diffusion-v1-5']
      })

      const { filteredAssets } = useAssetBrowser(ref([apiAsset]))
      const result = filteredAssets.value[0]

      expect(result.badges).toContainEqual({
        label: 'stable-diffusion-v1-5',
        type: 'type'
      })
    })

    it('handles tags without slash for badges', () => {
      const apiAsset = createApiAsset({
        tags: ['models', 'checkpoints']
      })

      const { filteredAssets } = useAssetBrowser(ref([apiAsset]))
      const result = filteredAssets.value[0]

      expect(result.badges).toContainEqual({
        label: 'checkpoints',
        type: 'type'
      })
    })

    it('handles tags with multiple slashes in badges', () => {
      const apiAsset = createApiAsset({
        tags: ['models', 'checkpoint/subfolder/model-name']
      })

      const { filteredAssets } = useAssetBrowser(ref([apiAsset]))
      const result = filteredAssets.value[0]

      expect(result.badges).toContainEqual({
        label: 'subfolder/model-name',
        type: 'type'
      })
    })
  })

  describe('Tag-Based Filtering', () => {
    it('filters assets by category tag', async () => {
      const assets = [
        createApiAsset({ id: '1', tags: ['models', 'checkpoints'] }),
        createApiAsset({ id: '2', tags: ['models', 'loras'] }),
        createApiAsset({ id: '3', tags: ['models', 'checkpoints'] })
      ]

      const { selectedNavItem, filteredAssets } = useAssetBrowser(ref(assets))

      selectedNavItem.value = 'checkpoints'
      await nextTick()

      expect(filteredAssets.value).toHaveLength(2)
      expect(
        filteredAssets.value.every((asset) =>
          asset.tags.includes('checkpoints')
        )
      ).toBe(true)
    })

    it('returns all assets when category is "all"', async () => {
      const assets = [
        createApiAsset({ id: '1', tags: ['models', 'checkpoints'] }),
        createApiAsset({ id: '2', tags: ['models', 'loras'] })
      ]

      const { selectedNavItem, filteredAssets } = useAssetBrowser(ref(assets))

      selectedNavItem.value = 'all'
      await nextTick()

      expect(filteredAssets.value).toHaveLength(2)
    })
  })

  describe('Fuzzy Search Functionality', () => {
    it('searches across asset name with exact match', async () => {
      const assets = [
        createApiAsset({ name: 'realistic_vision.safetensors' }),
        createApiAsset({ name: 'anime_style.ckpt' }),
        createApiAsset({ name: 'photorealistic_v2.safetensors' })
      ]

      const { searchQuery, filteredAssets } = useAssetBrowser(ref(assets))

      searchQuery.value = 'realistic'
      await nextTick()

      expect(filteredAssets.value.length).toBeGreaterThanOrEqual(1)
      expect(
        filteredAssets.value.some((asset) =>
          asset.name.toLowerCase().includes('realistic')
        )
      ).toBe(true)
    })

    it('searches across asset tags', async () => {
      const assets = [
        createApiAsset({
          name: 'model1.safetensors',
          tags: ['models', 'checkpoints']
        }),
        createApiAsset({
          name: 'model2.safetensors',
          tags: ['models', 'loras']
        })
      ]

      const { searchQuery, filteredAssets } = useAssetBrowser(ref(assets))

      searchQuery.value = 'checkpoints'
      await nextTick()

      expect(filteredAssets.value.length).toBeGreaterThanOrEqual(1)
      expect(filteredAssets.value[0].tags).toContain('checkpoints')
    })

    it('supports fuzzy matching with typos', async () => {
      const assets = [
        createApiAsset({ name: 'checkpoint_model.safetensors' }),
        createApiAsset({ name: 'lora_model.safetensors' })
      ]

      const { searchQuery, filteredAssets } = useAssetBrowser(ref(assets))

      // Intentional typo - fuzzy search should still find it
      searchQuery.value = 'chckpoint'
      await nextTick()

      expect(filteredAssets.value.length).toBeGreaterThanOrEqual(1)
      expect(filteredAssets.value[0].name).toContain('checkpoint')
    })

    it('handles empty search by returning all assets', async () => {
      const assets = [
        createApiAsset({ name: 'test1.safetensors' }),
        createApiAsset({ name: 'test2.safetensors' })
      ]

      const { searchQuery, filteredAssets } = useAssetBrowser(ref(assets))

      searchQuery.value = ''
      await nextTick()

      expect(filteredAssets.value).toHaveLength(2)
    })

    it('handles no search results', async () => {
      const assets = [createApiAsset({ name: 'test.safetensors' })]

      const { searchQuery, filteredAssets } = useAssetBrowser(ref(assets))

      searchQuery.value = 'completelydifferentstring123'
      await nextTick()

      expect(filteredAssets.value).toHaveLength(0)
    })

    it('performs case-insensitive search', async () => {
      const assets = [
        createApiAsset({ name: 'RealisticVision.safetensors' }),
        createApiAsset({ name: 'anime_style.ckpt' })
      ]

      const { searchQuery, filteredAssets } = useAssetBrowser(ref(assets))

      searchQuery.value = 'REALISTIC'
      await nextTick()

      expect(filteredAssets.value.length).toBeGreaterThanOrEqual(1)
      expect(filteredAssets.value[0].name).toContain('Realistic')
    })

    it('combines fuzzy search with format filter', async () => {
      const assets = [
        createApiAsset({ name: 'my_checkpoint_model.safetensors' }),
        createApiAsset({ name: 'my_checkpoint_model.ckpt' }),
        createApiAsset({ name: 'different_lora.safetensors' })
      ]

      const { searchQuery, updateFilters, filteredAssets } = useAssetBrowser(
        ref(assets)
      )

      searchQuery.value = 'checkpoint'
      updateFilters({
        sortBy: 'name-asc',
        fileFormats: ['safetensors'],
        baseModels: []
      })
      await nextTick()

      expect(filteredAssets.value.length).toBeGreaterThanOrEqual(1)
      expect(
        filteredAssets.value.every((asset) =>
          asset.name.endsWith('.safetensors')
        )
      ).toBe(true)
      expect(
        filteredAssets.value.some((asset) => asset.name.includes('checkpoint'))
      ).toBe(true)
    })

    it('combines fuzzy search with base model filter', async () => {
      const assets = [
        createApiAsset({
          name: 'realistic_sd15.safetensors',
          user_metadata: { base_model: 'SD1.5' }
        }),
        createApiAsset({
          name: 'realistic_sdxl.safetensors',
          user_metadata: { base_model: 'SDXL' }
        })
      ]

      const { searchQuery, updateFilters, filteredAssets } = useAssetBrowser(
        ref(assets)
      )

      searchQuery.value = 'realistic'
      updateFilters({
        sortBy: 'name-asc',
        fileFormats: [],
        baseModels: ['SDXL']
      })
      await nextTick()

      expect(filteredAssets.value).toHaveLength(1)
      expect(filteredAssets.value[0].name).toBe('realistic_sdxl.safetensors')
    })
  })

  describe('Combined Search and Filtering', () => {
    it('applies both search and category filter', async () => {
      const assets = [
        createApiAsset({
          name: 'realistic_checkpoint.safetensors',
          tags: ['models', 'checkpoints']
        }),
        createApiAsset({
          name: 'realistic_lora.safetensors',
          tags: ['models', 'loras']
        }),
        createApiAsset({
          name: 'anime_checkpoint.safetensors',
          tags: ['models', 'checkpoints']
        })
      ]

      const { searchQuery, selectedNavItem, filteredAssets } = useAssetBrowser(
        ref(assets)
      )

      searchQuery.value = 'realistic'
      selectedNavItem.value = 'checkpoints'
      await nextTick()

      expect(filteredAssets.value).toHaveLength(1)
      expect(filteredAssets.value[0].name).toBe(
        'realistic_checkpoint.safetensors'
      )
    })
  })

  describe('Sorting', () => {
    it('sorts assets by name', async () => {
      const assets = [
        createApiAsset({ name: 'zebra.safetensors' }),
        createApiAsset({ name: 'alpha.safetensors' }),
        createApiAsset({ name: 'beta.safetensors' })
      ]

      const { updateFilters, filteredAssets } = useAssetBrowser(ref(assets))

      updateFilters({
        sortBy: 'name',
        fileFormats: [],
        baseModels: []
      })
      await nextTick()

      const names = filteredAssets.value.map((asset) => asset.name)
      expect(names).toEqual([
        'alpha.safetensors',
        'beta.safetensors',
        'zebra.safetensors'
      ])
    })

    it('sorts assets by creation date', async () => {
      const assets = [
        createApiAsset({ created_at: '2024-03-01T00:00:00Z' }),
        createApiAsset({ created_at: '2024-01-01T00:00:00Z' }),
        createApiAsset({ created_at: '2024-02-01T00:00:00Z' })
      ]

      const { updateFilters, filteredAssets } = useAssetBrowser(ref(assets))

      updateFilters({
        sortBy: 'recent',
        fileFormats: [],
        baseModels: []
      })
      await nextTick()

      const dates = filteredAssets.value.map((asset) => asset.created_at)
      expect(dates).toEqual([
        '2024-03-01T00:00:00Z',
        '2024-02-01T00:00:00Z',
        '2024-01-01T00:00:00Z'
      ])
    })
  })

  describe('Ownership filtering via nav selection', () => {
    it('shows all assets when "all" is selected', async () => {
      const assets = [
        createApiAsset({ name: 'my-model.safetensors', is_immutable: false }),
        createApiAsset({
          name: 'public-model.safetensors',
          is_immutable: true
        }),
        createApiAsset({
          name: 'another-my-model.safetensors',
          is_immutable: false
        })
      ]

      const { selectedNavItem, filteredAssets } = useAssetBrowser(ref(assets))

      selectedNavItem.value = 'all'
      await nextTick()

      expect(filteredAssets.value).toHaveLength(3)
    })

    it('shows only imported models when "imported" is selected', async () => {
      const assets = [
        createApiAsset({ name: 'my-model.safetensors', is_immutable: false }),
        createApiAsset({
          name: 'public-model.safetensors',
          is_immutable: true
        }),
        createApiAsset({
          name: 'another-my-model.safetensors',
          is_immutable: false
        })
      ]

      const { selectedNavItem, filteredAssets } = useAssetBrowser(ref(assets))

      selectedNavItem.value = 'imported'
      await nextTick()

      expect(filteredAssets.value).toHaveLength(2)
      expect(filteredAssets.value.every((asset) => !asset.is_immutable)).toBe(
        true
      )
    })

    it('isImportedSelected reflects nav selection', () => {
      const assets = [createApiAsset()]
      const { selectedNavItem, isImportedSelected } = useAssetBrowser(
        ref(assets)
      )

      expect(isImportedSelected.value).toBe(false)

      selectedNavItem.value = 'imported'
      expect(isImportedSelected.value).toBe(true)

      selectedNavItem.value = 'all'
      expect(isImportedSelected.value).toBe(false)
    })
  })

  describe('Nav Items Structure', () => {
    it('returns quick filters and grouped type categories', () => {
      const assets = [
        createApiAsset({ tags: ['models', 'checkpoints'] }),
        createApiAsset({ tags: ['models', 'loras'] }),
        createApiAsset({ tags: ['models', 'checkpoints'] })
      ]

      const { navItems } = useAssetBrowser(ref(assets))

      expect(navItems.value).toHaveLength(3)
      expect(navItems.value[0]).toEqual({
        id: 'all',
        label: 'All Models',
        icon: 'icon-[lucide--list]'
      })
      expect(navItems.value[1]).toEqual({
        id: 'imported',
        label: 'Imported',
        icon: 'icon-[lucide--folder-input]'
      })
      expect(navItems.value[2]).toMatchObject({
        title: 'By type',
        collapsible: false
      })
      const byTypeGroup = navItems.value[2] as { items: unknown[] }
      expect(byTypeGroup.items).toHaveLength(2)
    })

    it('handles assets with no category tag', () => {
      const assets = [
        createApiAsset({ tags: ['models'] }),
        createApiAsset({ tags: ['models', 'vae'] })
      ]

      const { navItems } = useAssetBrowser(ref(assets))

      expect(navItems.value).toHaveLength(3)
      const byTypeGroup = navItems.value[2] as { items: { id: string }[] }
      expect(byTypeGroup.items).toHaveLength(1)
      expect(byTypeGroup.items[0].id).toBe('vae')
    })

    it('ignores non-models root tags', () => {
      const assets = [
        createApiAsset({ tags: ['input', 'images'] }),
        createApiAsset({ tags: ['models', 'checkpoints'] })
      ]

      const { navItems } = useAssetBrowser(ref(assets))

      const byTypeGroup = navItems.value[2] as { items: { id: string }[] }
      expect(byTypeGroup.items).toHaveLength(1)
      expect(byTypeGroup.items[0].id).toBe('checkpoints')
    })

    it('returns only quick filters when no type categories exist', () => {
      const assets = [createApiAsset({ tags: ['models'] })]

      const { navItems } = useAssetBrowser(ref(assets))

      expect(navItems.value).toHaveLength(2)
      expect(navItems.value[0]).toMatchObject({ id: 'all' })
      expect(navItems.value[1]).toMatchObject({ id: 'imported' })
    })

    it('computes content title from selected nav item', () => {
      const assets = [createApiAsset({ tags: ['models', 'checkpoints'] })]
      const { selectedNavItem, contentTitle } = useAssetBrowser(ref(assets))

      expect(contentTitle.value).toBe('All Models')

      selectedNavItem.value = 'imported'
      expect(contentTitle.value).toBe('Imported')

      selectedNavItem.value = 'checkpoints'
      expect(contentTitle.value).toBe('Checkpoints')

      selectedNavItem.value = 'unknown'
      expect(contentTitle.value).toBe('Assets')
    })

    it('groups models by top-level folder name', () => {
      const assets = [
        createApiAsset({
          id: 'asset-1',
          tags: ['models', 'Chatterbox/subfolder1/model1']
        }),
        createApiAsset({
          id: 'asset-2',
          tags: ['models', 'Chatterbox/subfolder2/model2']
        }),
        createApiAsset({
          id: 'asset-3',
          tags: ['models', 'Chatterbox/subfolder3/model3']
        }),
        createApiAsset({
          id: 'asset-4',
          tags: ['models', 'OtherFolder/subfolder1/model4']
        })
      ]

      const { navItems, selectedNavItem, categoryFilteredAssets } =
        useAssetBrowser(ref(assets))

      const byTypeGroup = navItems.value[2] as { items: { id: string }[] }
      expect(byTypeGroup.items.map((i) => i.id)).toEqual([
        'Chatterbox',
        'OtherFolder'
      ])

      selectedNavItem.value = 'Chatterbox'
      expect(categoryFilteredAssets.value).toHaveLength(3)
      expect(categoryFilteredAssets.value.map((a) => a.id)).toEqual([
        'asset-1',
        'asset-2',
        'asset-3'
      ])

      selectedNavItem.value = 'OtherFolder'
      expect(categoryFilteredAssets.value).toHaveLength(1)
      expect(categoryFilteredAssets.value[0].id).toBe('asset-4')
    })
  })
})
