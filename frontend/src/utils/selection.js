export function toggleIdSelection(selectedIds = [], id) {
  const normalizedId = String(id || '');
  if (!normalizedId) return [...selectedIds];
  return selectedIds.includes(normalizedId)
    ? selectedIds.filter((selectedId) => selectedId !== normalizedId)
    : [...selectedIds, normalizedId];
}

export function mergeIdSelections(selectedIds = [], ids = []) {
  return [...new Set([...selectedIds, ...ids].map(String).filter(Boolean))];
}

