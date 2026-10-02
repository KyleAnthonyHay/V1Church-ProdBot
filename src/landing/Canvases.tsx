import { motion } from "motion/react";

/**
 * Hero canvases: one line illustration per problem ProdBot solves.
 * Each pairs the Sunday-morning problem with the feature that answers it.
 */
export const CANVASES = [
  {
    id: "ask",
    label: "Ask",
    problem: "Something breaks mid-service and the lead isn't in the booth.",
    fix: "Volunteers ask ProdBot and get their campus's fix, step by step.",
  },
  {
    id: "wiring",
    label: "Wiring",
    problem: "Nobody remembers what plugs into what.",
    fix: "Every device, cable and signal on one diagram you can search and focus.",
  },
  {
    id: "pitfalls",
    label: "Pitfalls",
    problem: "The same failure keeps coming back every few Sundays.",
    fix: "Fixes are written down symptom-first, so the next volunteer finds them.",
  },
  {
    id: "docs",
    label: "Docs",
    problem: "Notes from the booth never make it into the docs.",
    fix: "Paste notes or a PDF, the AI drafts it, and an admin approves it.",
  },
] as const;
export type CanvasId = (typeof CANVASES)[number]["id"];

const EASE = [0.22, 1, 0.36, 1] as const;

/** A stroke that draws itself in. `mini` renders it finished, no motion. */
function Stroke({
  d,
  i = 0,
  mini,
  faint,
}: {
  d: string;
  i?: number;
  mini?: boolean;
  faint?: boolean;
}) {
  const opacity = faint ? 0.35 : 1;
  if (mini) return <path d={d} opacity={opacity} />;
  return (
    <motion.path
      d={d}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity }}
      transition={{
        pathLength: { duration: 1.2, delay: 0.1 + i * 0.12, ease: EASE },
        opacity: { duration: 0.3, delay: 0.1 + i * 0.12 },
      }}
    />
  );
}

/** Fades in once (for dashed strokes, which can't draw in). */
function Fade({
  children,
  i = 0,
  mini,
}: {
  children: React.ReactNode;
  i?: number;
  mini?: boolean;
}) {
  if (mini) return <g>{children}</g>;
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 + i * 0.12 }}
    >
      {children}
    </motion.g>
  );
}

/** Repeating pulse for live details: typing, focus rings, sparkles. */
function Pulse({
  children,
  delay = 0,
  mini,
}: {
  children: React.ReactNode;
  delay?: number;
  mini?: boolean;
}) {
  if (mini) return <g opacity={0.6}>{children}</g>;
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{
        duration: 2.2,
        delay: 1.6 + delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.g>
  );
}

/** Rounded rectangle as a single path, so it can draw in. */
function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

/** Tiny church glyph, the ProdBot mark, centred on (cx, cy). */
function churchGlyph(cx: number, cy: number) {
  return `M${cx - 9} ${cy + 9} V${cy - 1} L${cx} ${cy - 8} L${cx + 9} ${cy - 1} V${cy + 9} Z M${cx} ${cy - 8} V${cy - 14} M${cx - 3} ${cy - 11} H${cx + 3} M${cx - 3} ${cy + 9} V${cy + 3} H${cx + 3} V${cy + 9}`;
}

export function CanvasIllustration({
  id,
  mini,
  className,
}: {
  id: CanvasId;
  mini?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 640 340"
      fill="none"
      stroke="currentColor"
      strokeWidth={mini ? 5 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {id === "ask" && <Ask mini={mini} />}
      {id === "wiring" && <Wiring mini={mini} />}
      {id === "pitfalls" && <Pitfalls mini={mini} />}
      {id === "docs" && <Docs mini={mini} />}
    </svg>
  );
}

/** A volunteer's question, answered as numbered checks that tick off. */
function Ask({ mini }: { mini?: boolean }) {
  const steps = [176, 222, 268];
  return (
    <>
      {/* Volunteer */}
      <Stroke d={rr(300, 30, 250, 56, 20)} mini={mini} />
      <Stroke d="M326 52 H520 M326 66 H448" i={1} mini={mini} faint />
      <Stroke
        d="M584 58 m-13 0 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 M572 92 Q584 78 596 92"
        i={1}
        mini={mini}
      />
      {/* ProdBot */}
      <Stroke d={rr(52, 118, 34, 34, 9)} i={2} mini={mini} />
      <Stroke d={churchGlyph(69, 137)} i={2} mini={mini} />
      <Stroke d={rr(104, 118, 380, 196, 22)} i={3} mini={mini} />
      <Stroke d="M132 144 H260" i={4} mini={mini} faint />
      {steps.map((y, k) => (
        <g key={y}>
          <Stroke
            d={`M146 ${y} m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0`}
            i={5 + k}
            mini={mini}
          />
          <Stroke d={`M141 ${y} l4 4 l7 -8`} i={8 + k * 1.5} mini={mini} />
          <Stroke
            d={`M172 ${y - 5} H${430 - k * 40} M172 ${y + 7} H${360 - k * 30}`}
            i={5 + k}
            mini={mini}
            faint
          />
        </g>
      ))}
      {/* Typing indicator for the next answer */}
      <Pulse mini={mini}>
        <path
          d="M520 292 h0 M534 292 h0 M548 292 h0"
          strokeWidth={mini ? 10 : 6}
        />
      </Pulse>
    </>
  );
}

const CABLES = [
  "M166 170 C208 170 208 90 250 90",
  "M166 170 C208 170 208 250 250 250",
  "M370 90 C420 90 420 170 470 170",
  "M370 250 C420 250 420 170 470 170",
];

/** The signal chain, with one device in focus. */
function Wiring({ mini }: { mini?: boolean }) {
  const nodes = [
    [66, 142, 100],
    [250, 62, 120],
    [250, 222, 120],
    [470, 142, 120],
  ] as const;
  return (
    <>
      {nodes.map(([x, y, w], i) => (
        <g key={i}>
          <Stroke d={rr(x, y, w, 56, 12)} i={i} mini={mini} />
          <Stroke
            d={`M${x + 18} ${y + 22} H${x + 64} M${x + 18} ${y + 34} H${x + 44}`}
            i={i + 1}
            mini={mini}
            faint
          />
        </g>
      ))}
      {/* The focused device: a ring, and an "inside" badge */}
      <Fade i={6} mini={mini}>
        <path d={rr(240, 52, 140, 76, 18)} strokeDasharray="5 6" />
      </Fade>
      <Stroke d={rr(338, 70, 26, 18, 5)} i={7} mini={mini} />
      <Stroke d="M344 79 H358" i={7} mini={mini} faint />
      {CABLES.map((d, i) => (
        <g key={i}>
          <Stroke d={d} i={4 + i} mini={mini} />
          {!mini && (
            <circle r={3.5} fill="currentColor" stroke="none">
              <animateMotion
                dur="2.6s"
                begin={`${1.6 + i * 0.4}s`}
                repeatCount="indefinite"
                path={d}
              />
            </circle>
          )}
        </g>
      ))}
      {/* Cable tags */}
      <Stroke
        d="M196 126 h14 M196 212 h14 M426 126 h14 M426 212 h14"
        i={8}
        mini={mini}
        faint
      />
    </>
  );
}

/** A volunteer's report becomes a pitfall card: issue, cause, solution. */
function Pitfalls({ mini }: { mini?: boolean }) {
  const rows = [118, 172, 226];
  return (
    <>
      {/* Volunteer report */}
      <Stroke d={rr(44, 44, 156, 50, 16)} mini={mini} />
      <Stroke
        d="M64 62 q-4 6 0 10 M74 62 q-4 6 0 10 M90 64 H180 M90 76 H150"
        i={1}
        mini={mini}
        faint
      />
      {/* Warning */}
      <Stroke d="M122 140 L172 226 H72 Z" i={2} mini={mini} />
      <Stroke d="M122 168 V196 M122 208 v3" i={3} mini={mini} />
      <Stroke d="M122 96 V128" i={2} mini={mini} faint />
      <Stroke d="M186 184 H232 M224 176 l8 8 l-8 8" i={4} mini={mini} />
      {/* Pitfall card */}
      <Stroke d={rr(248, 72, 220, 214, 18)} i={5} mini={mini} />
      {rows.map((y, k) => (
        <g key={y}>
          <Stroke
            d={
              k === 0
                ? `M272 ${y + 7} l7 -13 l7 13 Z`
                : k === 1
                  ? `M279 ${y} m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M284 ${y + 5} l5 5`
                  : `M273 ${y} l5 5 l9 -10`
            }
            i={6 + k}
            mini={mini}
          />
          <Stroke
            d={`M302 ${y - 5} H${360 + k * 10} M302 ${y + 7} H${440 - k * 20}`}
            i={6 + k}
            mini={mini}
            faint
          />
        </g>
      ))}
      <Stroke d="M484 184 H520 M512 176 l8 8 l-8 8" i={9} mini={mini} />
      {/* Fixed, and findable next time */}
      <Stroke
        d="M568 184 m-36 0 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0"
        i={10}
        mini={mini}
      />
      <Stroke d="M552 184 l11 11 l22 -24" i={11} mini={mini} />
      <Pulse mini={mini}>
        <path
          d="M568 184 m-50 0 a50 50 0 1 0 100 0 a50 50 0 1 0 -100 0"
          strokeDasharray="3 7"
        />
      </Pulse>
    </>
  );
}

/** Notes and a PDF go in, the AI drafts, an admin approves. */
function Docs({ mini }: { mini?: boolean }) {
  const page = (x: number, y: number) =>
    `M${x} ${y} H${x + 82} L${x + 104} ${y + 22} V${y + 160} H${x} Z M${x + 82} ${y} V${y + 22} H${x + 104}`;
  return (
    <>
      {/* Source notes and PDF */}
      <Stroke d={page(58, 58)} mini={mini} faint />
      <Stroke d={page(44, 82)} i={1} mini={mini} />
      <Stroke
        d="M62 128 H124 M62 144 H130 M62 160 H112 M62 176 H126 M62 192 H98"
        i={2}
        mini={mini}
        faint
      />
      <Stroke d={rr(60, 210, 34, 16, 4)} i={2} mini={mini} />
      {/* AI */}
      <Stroke d="M166 162 H226 M218 154 l8 8 l-8 8" i={3} mini={mini} />
      <Pulse mini={mini}>
        <path
          d="M196 118 V142 M184 130 H208 M188 122 l16 16 M204 122 l-16 16"
          strokeWidth={mini ? 4 : 1.2}
        />
      </Pulse>
      {/* Draft, with additions and a removal */}
      <Fade i={4} mini={mini}>
        <path d={rr(244, 48, 180, 236, 14)} strokeDasharray="6 7" />
      </Fade>
      <Stroke d="M268 80 H340" i={5} mini={mini} />
      <Stroke d="M268 112 H396 M268 132 H380" i={6} mini={mini} faint />
      <Stroke d="M262 164 h8 M266 160 v8 M282 164 H396" i={7} mini={mini} />
      <Stroke d="M262 188 h8 M266 184 v8 M282 188 H372" i={8} mini={mini} />
      <Stroke d="M262 212 h8 M282 212 H360" i={9} mini={mini} faint />
      <Stroke d="M268 244 H392 M268 260 H352" i={9} mini={mini} faint />
      {/* Approve */}
      <Stroke d="M440 166 H470 M462 158 l8 8 l-8 8" i={10} mini={mini} />
      <Stroke d={rr(484, 140, 116, 52, 26)} i={11} mini={mini} />
      <Stroke d="M506 166 l7 7 l13 -14 M540 166 H580" i={12} mini={mini} />
      {/* Revision history */}
      <Stroke d={rr(494, 214, 96, 16, 5)} i={13} mini={mini} faint />
      <Stroke d={rr(500, 236, 84, 14, 5)} i={13} mini={mini} faint />
      <Stroke d={rr(506, 256, 72, 12, 5)} i={13} mini={mini} faint />
    </>
  );
}
