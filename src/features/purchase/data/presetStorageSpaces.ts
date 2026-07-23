export type PresetStorageSpace = Readonly<{
  id: string;
  name: string;
  site: string;
  displayCapacity: string;
}>;

export const PRESET_STORAGE_SPACES = [
  {
    id: 'preset-shared-space-east',
    name: '通用共享存储',
    site: '东部算力中心',
    displayCapacity: '2 TB',
  },
  {
    id: 'preset-shared-space-west',
    name: '高性能共享存储',
    site: '西部算力中心',
    displayCapacity: '4 TB',
  },
] as const satisfies readonly PresetStorageSpace[];

export function getPresetStorageSpaceById(id: string) {
  return PRESET_STORAGE_SPACES.find((space) => space.id === id);
}

export function getPresetStorageSpacesForSite(site: string) {
  return PRESET_STORAGE_SPACES.filter((space) => space.site === site);
}
