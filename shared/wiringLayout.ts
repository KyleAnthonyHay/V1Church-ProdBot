// Deterministic layout for one level of a wiring diagram.
//
// Devices flow left to right in columns (a device sits one column right of
// whatever feeds it). Each group box is sized from the devices inside it and
// placed where it is closest to the devices it connects to, without ever
// overlapping another box. Everything is computed from content sizes, so
// adding devices to one group grows its box and pushes its neighbours out of
// the way instead of drawing over them.
import { NODE_GROUPS, type NodeGroup, type WiringView } from "./wiring";

export interface LayoutMetrics {
  nodeW: number;
  nodeH: number;
  /** Vertical space between devices stacked in one column. */
  nodeGap: number;
  /** Horizontal space between device columns, measured card edge to card edge. */
  colGap: number;
  /** Space between a group box edge and the devices inside it. */
  padX: number;
  padY: number;
  /** Height of the group name bar at the top of a box. */
  labelH: number;
  /** Minimum space kept between boxes (and free-standing devices). */
  boxGap: number;
}

export interface LayoutBox {
  group: NodeGroup;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WiringLayout {
  boxes: LayoutBox[];
  /** Absolute top-left corner of every device drawn at this level. */
  nodes: Map<string, { x: number; y: number }>;
  /** Column of every device, 0 = leftmost. */
  ranks: Map<string, number>;
  width: number;
  height: number;
}

/**
 * Column per device: one right of its furthest-left feed. Cycles are broken
 * by dropping the edge that closes them; a device with no feeds is pulled
 * right so it sits beside the first device it feeds.
 */
export function rankNodes(
  ids: readonly string[],
  edges: readonly (readonly [string, string])[],
): Map<string, number> {
  const known = new Set(ids);
  const succ = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [a, b] of edges) {
    if (a === b || !known.has(a) || !known.has(b)) continue;
    succ.get(a)!.push(b);
  }
  // Depth-first walk from the devices nothing feeds (then input order); an
  // edge back into the current path closes a cycle and is left out of the
  // ranking, so a loop's return leg is the one dropped.
  const indegAll = new Map(ids.map((id) => [id, 0]));
  for (const targets of succ.values())
    for (const v of targets) indegAll.set(v, indegAll.get(v)! + 1);
  const roots = [...ids].sort(
    (a, b) => indegAll.get(a)! - indegAll.get(b)! || ids.indexOf(a) - ids.indexOf(b),
  );
  const state = new Map<string, 1 | 2>();
  const kept: [string, string][] = [];
  const visit = (u: string) => {
    state.set(u, 1);
    for (const v of succ.get(u)!) {
      const s = state.get(v);
      if (s === 1) continue;
      kept.push([u, v]);
      if (s === undefined) visit(v);
    }
    state.set(u, 2);
  };
  for (const id of roots) if (!state.has(id)) visit(id);

  const preds = new Map<string, string[]>(ids.map((id) => [id, []]));
  const outs = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [a, b] of kept) {
    preds.get(b)!.push(a);
    outs.get(a)!.push(b);
  }
  const rank = new Map<string, number>();
  const indeg = new Map(ids.map((id) => [id, preds.get(id)!.length]));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  for (const id of queue) rank.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i]!;
    for (const v of outs.get(u)!) {
      rank.set(v, Math.max(rank.get(v) ?? 0, rank.get(u)! + 1));
      indeg.set(v, indeg.get(v)! - 1);
      if (indeg.get(v) === 0) queue.push(v);
    }
  }
  for (const id of ids) {
    if (preds.get(id)!.length > 0) continue;
    const next = outs.get(id)!;
    if (next.length === 0) continue;
    rank.set(id, Math.min(...next.map((v) => rank.get(v)!)) - 1);
  }
  const min = Math.min(0, ...rank.values());
  for (const [id, r] of rank) rank.set(id, r - min);
  return rank;
}

interface Item {
  group?: NodeGroup;
  r0: number;
  r1: number;
  columns: Map<number, string[]>;
  order: number;
}

interface Placed {
  x0: number;
  x1: number;
  y: number;
  h: number;
}

/**
 * Lowest-cost vertical slot for a box of height `h` spanning `x0..x1`: at
 * `desired` when free, otherwise the nearest free slot above or below the
 * boxes in the way (ties go below, so later groups read downwards).
 */
function freeY(
  h: number,
  x0: number,
  x1: number,
  desired: number,
  placed: readonly Placed[],
  gap: number,
): number {
  const blockers = placed.filter((b) => b.x0 < x1 + gap && b.x1 + gap > x0);
  const clear = (y: number) =>
    blockers.every((b) => y + h + gap <= b.y || y >= b.y + b.h + gap);
  if (clear(desired)) return desired;
  const candidates = blockers.flatMap((b) => [b.y - gap - h, b.y + b.h + gap]);
  let best = desired;
  let bestCost = Infinity;
  for (const y of candidates) {
    if (!clear(y)) continue;
    const cost = Math.abs(y - desired);
    if (cost < bestCost || (cost === bestCost && y > best)) {
      best = y;
      bestCost = cost;
    }
  }
  return best;
}

export function layoutWiring(
  view: WiringView,
  m: LayoutMetrics,
): WiringLayout {
  const ids = view.nodes.map((n) => n.id);
  const ranks = rankNodes(
    ids,
    view.edges.map((e) => [e.from, e.to] as const),
  );
  const preds = new Map<string, string[]>(ids.map((id) => [id, []]));
  const succs = new Map<string, string[]>(ids.map((id) => [id, []]));
  const known = new Set(ids);
  for (const e of view.edges) {
    if (e.from === e.to || !known.has(e.from) || !known.has(e.to)) continue;
    preds.get(e.to)!.push(e.from);
    succs.get(e.from)!.push(e.to);
  }

  // One item per group box; outside devices form a free-standing stack per
  // column so they never sit inside a box.
  const items = new Map<string, Item>();
  for (const n of view.nodes) {
    const r = ranks.get(n.id)!;
    const outside = view.external.has(n.id);
    const key = outside ? `ext:${r}` : `g:${n.group}`;
    let item = items.get(key);
    if (!item) {
      item = {
        group: outside ? undefined : n.group,
        r0: r,
        r1: r,
        columns: new Map(),
        // Groups in their catalogue order; loose devices after the groups
        // that start in the same column.
        order: outside
          ? NODE_GROUPS.length + r
          : NODE_GROUPS.indexOf(n.group),
      };
      items.set(key, item);
    }
    item.r0 = Math.min(item.r0, r);
    item.r1 = Math.max(item.r1, r);
    item.columns.set(r, [...(item.columns.get(r) ?? []), n.id]);
  }
  const ordered = [...items.values()].sort(
    (a, b) => a.r0 - b.r0 || a.order - b.order,
  );

  const pitch = m.nodeH + m.nodeGap;
  const colX = (r: number) => r * (m.nodeW + m.colGap);
  const positions = new Map<string, { x: number; y: number }>();
  const placed: Placed[] = [];
  const boxes: LayoutBox[] = [];
  for (const item of ordered) {
    const boxed = item.group !== undefined;
    const padX = boxed ? m.padX : 0;
    const padY = boxed ? m.padY : 0;
    const labelH = boxed ? m.labelH : 0;

    // Order each column so devices sit level with what feeds them: by the
    // mean position of their feeds (already placed, or in the previous
    // column of this box), then input order for the rest.
    const stacks: string[][] = [];
    const provisional = new Map<string, number>();
    for (let r = item.r0; r <= item.r1; r++) {
      const col = item.columns.get(r) ?? [];
      const keyed = col.map((id) => {
        const ys: number[] = [];
        for (const p of preds.get(id)!) {
          const at = positions.get(p);
          if (at) ys.push(at.y + m.nodeH / 2);
          else if (provisional.has(p)) ys.push(provisional.get(p)!);
        }
        return {
          id,
          key: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : null,
        };
      });
      const withKey = keyed.filter((k) => k.key !== null);
      withKey.sort((a, b) => a.key! - b.key!);
      const stack = [
        ...withKey.map((k) => k.id),
        ...keyed.filter((k) => k.key === null).map((k) => k.id),
      ];
      stack.forEach((id, i) => provisional.set(id, i * pitch + m.nodeH / 2));
      stacks.push(stack);
    }
    const innerH = Math.max(
      m.nodeH,
      ...stacks.map((s) => (s.length ? s.length * pitch - m.nodeGap : 0)),
    );
    const h = labelH + 2 * padY + innerH;
    const x0 = colX(item.r0) - padX;
    const x1 = colX(item.r1) + m.nodeW + padX;

    // Aim for the middle of everything already placed that this box is wired
    // to. With no such neighbour, continue the list below whatever already
    // occupies these columns.
    const neighbourYs: number[] = [];
    for (const stack of stacks)
      for (const id of stack)
        for (const other of [...preds.get(id)!, ...succs.get(id)!]) {
          const at = positions.get(other);
          if (at) neighbourYs.push(at.y + m.nodeH / 2);
        }
    let desired: number;
    if (neighbourYs.length) {
      desired =
        neighbourYs.reduce((a, b) => a + b, 0) / neighbourYs.length - h / 2;
    } else {
      const below = placed.filter((b) => b.x0 < x1 + m.boxGap && b.x1 + m.boxGap > x0);
      desired = below.length
        ? Math.max(...below.map((b) => b.y + b.h)) + m.boxGap
        : 0;
    }
    const y = freeY(h, x0, x1, desired, placed, m.boxGap);
    placed.push({ x0, x1, y, h });
    if (item.group !== undefined)
      boxes.push({ group: item.group, x: x0, y, w: x1 - x0, h });
    stacks.forEach((stack, i) => {
      const stackH = stack.length * pitch - m.nodeGap;
      const top = y + labelH + padY + (innerH - stackH) / 2;
      stack.forEach((id, j) =>
        positions.set(id, { x: colX(item.r0 + i), y: top + j * pitch }),
      );
    });
  }

  // Shift everything so the drawing starts at the origin.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const extend = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };
  for (const b of boxes) extend(b.x, b.y, b.w, b.h);
  for (const p of positions.values()) extend(p.x, p.y, m.nodeW, m.nodeH);
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
  for (const b of boxes) {
    b.x -= minX;
    b.y -= minY;
  }
  for (const p of positions.values()) {
    p.x -= minX;
    p.y -= minY;
  }
  return {
    boxes,
    nodes: positions,
    ranks,
    width: maxX - minX,
    height: maxY - minY,
  };
}
