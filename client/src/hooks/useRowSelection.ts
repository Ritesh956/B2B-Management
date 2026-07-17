import { useState } from 'react';

// Hook for managing row selection
export function useRowSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isPartiallySelected,
    selectedCount: selectedIds.size,
    selectedArray: Array.from(selectedIds),
  };
}
