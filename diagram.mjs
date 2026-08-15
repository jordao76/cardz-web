// Board diagrams, drawn from the depot coordinates in data/games.json.
//
// A preset places every depot either on the grid (col/row) or in pixels (x/y,
// which Clock uses to build its face), and both write into the same space:
//   position = gridGap + col * (cardWidth + gridGap)
// So the whole board can be drawn to scale with no screenshot and no app run,
// and it never goes stale — a layout change upstream redraws it.
//
// This shows a game's *shape*, not a deal: one card per depot, plus a ghost
// trail where the pile fans, so a reader can see at a glance that Bisley is
// thirteen columns between two rows of foundations and that Clock is a clock.

const TRAIL = 3; // ghost cards drawn along a fanning depot
const PAD = 14;

// Depot types, in legend order. Fills echo the site palette: a face-down stock
// reads dark, a foundation gold, an empty cell an outline.
const TYPES = {
  stock: { label: "Stock", fill: "#2b3a55", stroke: "#1b2740", dash: null },
  waste: { label: "Waste", fill: "#e2d4b8", stroke: "#9c8d76", dash: null },
  foundation: { label: "Foundation", fill: "#f6ecd6", stroke: "#c39a3f", dash: null },
  tableau: { label: "Tableau", fill: "#f3ecdb", stroke: "#9c8d76", dash: null },
  cell: { label: "Free cell", fill: "none", stroke: "#9c8d76", dash: "4 3" },
  reserve: { label: "Reserve", fill: "#e6d9bd", stroke: "#9c8d76", dash: null },
};

/** Where a depot sits, in the app's own pixel space. */
function position(depot, layout) {
  const { cardWidth, cardHeight, gridGap } = layout;
  return {
    x: depot.x ?? gridGap + (depot.col ?? 0) * (cardWidth + gridGap),
    y: depot.y ?? gridGap + (depot.row ?? 0) * (cardHeight + gridGap),
  };
}

/** Per-ghost offset along the fan, and whether the trail curves. */
function fanStep(fan, layout) {
  const down = layout.cardHeight * 0.19;
  const across = layout.cardWidth * 0.26;
  switch (fan) {
    case "down":
      return { dx: 0, dy: down };
    case "up":
      return { dx: 0, dy: -down };
    case "right":
      return { dx: across, dy: 0 };
    case "left":
      return { dx: -across, dy: 0 };
    // A radial fan opens as an arc around the pile's base (La Belle Lucie's
    // hand-held fans), so its trail turns instead of sliding.
    case "radial":
      return { dx: 0, dy: 0, spread: 13 };
    default:
      return null;
  }
}

function corners(x, y, w, h, angleDeg, pivot) {
  const points = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  if (!angleDeg) return points;
  const a = (angleDeg * Math.PI) / 180;
  const [cx, cy] = pivot;
  return points.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  });
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * An inline SVG of the board, plus a plain-language description of it.
 * Returns null for a board with nothing placeable.
 */
export function boardDiagram(game, layout) {
  const depots = game.board.depots;
  if (!depots.length) return null;

  const { cardWidth: w, cardHeight: h, cornerRadius: r } = layout;
  const shapes = [];
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  const track = (pts) => {
    for (const [px, py] of pts) {
      bounds.minX = Math.min(bounds.minX, px);
      bounds.minY = Math.min(bounds.minY, py);
      bounds.maxX = Math.max(bounds.maxX, px);
      bounds.maxY = Math.max(bounds.maxY, py);
    }
  };

  for (const depot of depots) {
    const style = TYPES[depot.type] ?? TYPES.tableau;
    const { x, y } = position(depot, layout);
    const angle = depot.angleDegrees ?? 0;
    const pivot = [x + w / 2, y + h / 2];
    const spin = angle ? ` transform="rotate(${round(angle)} ${round(pivot[0])} ${round(pivot[1])})"` : "";
    const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
    const step = fanStep(depot.fan, layout);

    // The trail is drawn first so the depot's own card sits on top of it.
    if (step) {
      for (let i = TRAIL; i >= 1; i--) {
        const gx = x + (step.dx ?? 0) * i;
        const gy = y + (step.dy ?? 0) * i;
        const lean = step.spread ? angle + step.spread * i : angle;
        // A radial fan turns about the base of the pile, not its middle.
        const gp = step.spread ? [x + w / 2, y + h] : [gx + w / 2, gy + h / 2];
        const t = ` transform="rotate(${round(lean)} ${round(gp[0])} ${round(gp[1])})"`;
        shapes.push(
          `<rect class="cfd-ghost" x="${round(gx)}" y="${round(gy)}" width="${w}" height="${h}" rx="${r}" ` +
            `fill="${style.fill === "none" ? "#f3ecdb" : style.fill}" stroke="${style.stroke}"${
              lean || step.spread ? t : ""
            }/>`
        );
        track(corners(gx, gy, w, h, lean, gp));
      }
    }

    shapes.push(
      `<rect x="${round(x)}" y="${round(y)}" width="${w}" height="${h}" rx="${r}" ` +
        `fill="${style.fill}" stroke="${style.stroke}"${dash}${spin}/>`
    );
    track(corners(x, y, w, h, angle, pivot));
  }

  const vx = round(bounds.minX - PAD);
  const vy = round(bounds.minY - PAD);
  const vw = round(bounds.maxX - bounds.minX + PAD * 2);
  const vh = round(bounds.maxY - bounds.minY + PAD * 2);

  const counts = new Map();
  for (const depot of depots) counts.set(depot.type, (counts.get(depot.type) ?? 0) + 1);
  const described = [...counts]
    .map(([type, n]) => `${n} ${(TYPES[type] ?? TYPES.tableau).label.toLowerCase()}${n > 1 ? "s" : ""}`)
    .join(", ");
  const legend = [...counts.keys()]
    .map((type) => {
      const style = TYPES[type] ?? TYPES.tableau;
      return (
        `<span><i style="background:${style.fill === "none" ? "transparent" : style.fill};` +
        `border-color:${style.stroke}${style.dash ? ";border-style:dashed" : ""}"></i>${style.label}</span>`
      );
    })
    .join("");

  // Ids are per-game so two diagrams on one page could never cross-label.
  const id = `board-${game.slug}`;
  const svg =
    `<svg viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-labelledby="${id}-title ${id}-desc" ` +
    `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">` +
    `<title id="${id}-title">The ${game.name} board</title>` +
    `<desc id="${id}-desc">${described}. Fanned piles are shown with a trail of cards.</desc>` +
    `<g stroke-width="1.5">${shapes.join("")}</g></svg>`;

  return { svg, legend, described, ratio: vw / vh };
}
