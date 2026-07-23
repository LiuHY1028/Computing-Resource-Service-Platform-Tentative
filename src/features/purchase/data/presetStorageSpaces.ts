export type PresetStorageSpace = Readonly<{
  id: string;
  name: string;
  site: string;
  displayCapacity: string;
}>;

import {
  findStorageSpace,
  getStorageSpacesForSite,
} from '../../storage';

function displayCapacity(capacityGb: number) {
  return capacityGb >= 1024
    ? `${Number((capacityGb / 1024).toFixed(1))} TB`
    : `${capacityGb} GB`;
}

export function getPresetStorageSpaceById(id: string) {
  const space = findStorageSpace(id);
  return space
    ? {
        id: space.id,
        name: space.name,
        site: space.site,
        displayCapacity: displayCapacity(space.capacityGb),
      }
    : undefined;
}

export function getPresetStorageSpacesForSite(site: string) {
  return getStorageSpacesForSite(site).map((space) => ({
    id: space.id,
    name: space.name,
    site: space.site,
    displayCapacity: displayCapacity(space.capacityGb),
  }));
}
