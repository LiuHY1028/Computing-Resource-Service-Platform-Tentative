export {
  createStorageSpace,
  deleteStorageSpace,
  findStorageSpace,
  getStorageMountsForResource,
  getStorageSpace,
  getStorageSpacesForSite,
  queryStorageSpaces,
  renameStorageSpace,
  requestStorageExpansion,
  requestStorageMount,
  requestStorageUnmount,
  resetStorageStore,
} from './state/storageStore';
export {
  storageAvailableGb,
  storageCapacityState,
  storageUsagePercent,
} from './types';
export type * from './types';
