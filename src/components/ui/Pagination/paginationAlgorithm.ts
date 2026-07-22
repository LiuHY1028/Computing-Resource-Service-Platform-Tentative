export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  const total = Math.max(0, Math.floor(totalPages));
  if (total === 0) return [];
  const current = Math.min(Math.max(1, Math.floor(currentPage)), total);
  const siblings = Math.max(0, Math.floor(siblingCount));
  const fullRangeThreshold = siblings * 2 + 5;
  if (total <= fullRangeThreshold) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  let left = Math.max(2, current - siblings);
  let right = Math.min(total - 1, current + siblings);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  if (!showLeftEllipsis) right = Math.min(total - 1, siblings * 2 + 3);
  if (!showRightEllipsis) left = Math.max(2, total - (siblings * 2 + 2));

  const items: PaginationItem[] = [1];
  if (left > 2) items.push('ellipsis-start');
  for (let page = left; page <= right; page += 1) items.push(page);
  if (right < total - 1) items.push('ellipsis-end');
  items.push(total);
  return items;
}
