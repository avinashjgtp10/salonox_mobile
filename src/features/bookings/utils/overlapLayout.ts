export interface OverlapItem {
  id: string;
  startMin: number;
  endMin: number;
}

export interface OverlapSlot {
  /** Which side-by-side column this item sits in (0-based). */
  col: number;
  /** How many columns the cluster of mutually-overlapping items needs. */
  totalCols: number;
}

/**
 * Groups time ranges into clusters of mutual overlap and assigns each item a
 * side-by-side column (like Google Calendar's day-view event layout), so
 * concurrent appointments for the same staff render next to each other
 * instead of stacking on top of one another.
 */
export function computeOverlapLayout(items: OverlapItem[]): Map<string, OverlapSlot> {
  const layout = new Map<string, OverlapSlot>();
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);

  let cluster: OverlapItem[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const itemCol = new Map<string, number>();
    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= item.startMin) {
          colEnds[c] = item.endMin;
          itemCol.set(item.id, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        colEnds.push(item.endMin);
        itemCol.set(item.id, colEnds.length - 1);
      }
    }
    const totalCols = colEnds.length;
    cluster.forEach((item) => layout.set(item.id, { col: itemCol.get(item.id)!, totalCols }));
  };

  for (const item of sorted) {
    if (item.startMin >= clusterEnd) {
      flushCluster();
      cluster = [item];
      clusterEnd = item.endMin;
    } else {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    }
  }
  flushCluster();

  return layout;
}
