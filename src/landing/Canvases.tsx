import { motion } from "motion/react";

/** Abstract line illustrations for the homepage hero canvases. */
export const CANVASES = [
  {
    id: "sanctuary",
    label: "Sanctuary",
    caption: "Every campus, one production assistant",
  },
  {
    id: "signal",
    label: "Signal",
    caption: "Traces the chain from source to speaker",
  },
  {
    id: "stage",
    label: "Stage",
    caption: "Knows what's plugged in and where",
  },
  {
    id: "sound",
    label: "Sound",
    caption: "Keeps Sunday sounding like Sunday",
  },
] as const;
export type CanvasId = (typeof CANVASES)[number]["id"];

const EASE = [0.22, 1, 0.36, 1] as const;

/** A stroke that draws itself in. `mini` renders it finished, no motion. */
function Stroke({
  d,
  i = 0,
  mini,
  dashed,
  faint,
}: {
  d: string;
  i?: number;
  mini?: boolean;
  dashed?: boolean;
  faint?: boolean;
}) {
  const style = {
    strokeDasharray: dashed ? "4 6" : undefined,
    opacity: faint ? 0.35 : 1,
  };
  if (mini) return <path d={d} style={style} />;
  return (
    <motion.path
      d={d}
      style={style}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: faint ? 0.35 : 1 }}
      transition={{
        pathLength: { duration: 1.4, delay: 0.1 + i * 0.12, ease: EASE },
        opacity: { duration: 0.3, delay: 0.1 + i * 0.12 },
      }}
    />
  );
}

/** Repeating pulse used for waves, beams and glints. */
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
        duration: 2.4,
        delay: 1.4 + delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.g>
  );
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
      viewBox="0 0 640 360"
      fill="none"
      stroke="currentColor"
      strokeWidth={mini ? 5 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {id === "sanctuary" && <Sanctuary mini={mini} />}
      {id === "signal" && <Signal mini={mini} />}
      {id === "stage" && <Stage mini={mini} />}
      {id === "sound" && <Sound mini={mini} />}
    </svg>
  );
}

function Sanctuary({ mini }: { mini?: boolean }) {
  const s = [
    "M70 300 H570",
    // tower and spire
    "M170 300 V160 H250 V300",
    "M162 160 L210 86 L258 160",
    "M210 86 V48 M197 62 H223",
    "M198 228 V206 A12 12 0 0 1 222 206 V228 Z",
    // nave
    "M250 300 V206 L350 142 L450 206 V300",
    "M330 300 V266 A20 20 0 0 1 370 266 V300",
    "M336 208 A14 14 0 1 0 364 208 A14 14 0 1 0 336 208",
    "M282 250 V232 A8 8 0 0 1 298 232 V250 Z M402 250 V232 A8 8 0 0 1 418 232 V250 Z",
  ];
  return (
    <>
      {s.map((d, i) => (
        <Stroke key={i} d={d} i={i} mini={mini} />
      ))}
      {[0, 1, 2].map((k) => (
        <Pulse key={k} delay={k * 0.35} mini={mini}>
          <path
            d={`M${478 + k * 22} ${236 - k * 16} A${26 + k * 22} ${26 + k * 22} 0 0 1 ${478 + k * 22} ${276 + k * 16}`}
          />
        </Pulse>
      ))}
      <Stroke
        d="M100 300 V284 M112 300 V276 M124 300 V286"
        i={9}
        mini={mini}
        faint
      />
      <Stroke
        d="M520 300 V286 M532 300 V278 M544 300 V284"
        i={9}
        mini={mini}
        faint
      />
    </>
  );
}

const SIGNAL_PATHS = [
  "M166 180 C208 180 208 100 250 100",
  "M166 180 C208 180 208 260 250 260",
  "M370 100 C420 100 420 180 470 180",
  "M370 260 C420 260 420 180 470 180",
];

function Signal({ mini }: { mini?: boolean }) {
  const nodes = [
    [66, 152],
    [250, 72],
    [250, 232],
    [470, 152],
  ] as const;
  return (
    <>
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <Stroke
            d={`M${x + 12} ${y} H${x + (i === 0 ? 88 : 108)} A12 12 0 0 1 ${x + (i === 0 ? 100 : 120)} ${y + 12} V${y + 44} A12 12 0 0 1 ${x + (i === 0 ? 88 : 108)} ${y + 56} H${x + 12} A12 12 0 0 1 ${x} ${y + 44} V${y + 12} A12 12 0 0 1 ${x + 12} ${y} Z`}
            i={i}
            mini={mini}
          />
          <Stroke
            d={`M${x + 18} ${y + 22} H${x + 64} M${x + 18} ${y + 34} H${x + 44}`}
            i={i + 1}
            mini={mini}
            faint
          />
        </g>
      ))}
      {SIGNAL_PATHS.map((d, i) => (
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
    </>
  );
}

function Stage({ mini }: { mini?: boolean }) {
  return (
    <>
      <Stroke d="M80 300 H560" mini={mini} />
      <Stroke d="M104 300 L132 254 H508 L536 300" i={1} mini={mini} />
      {/* lamps on a truss */}
      <Stroke d="M150 46 H490" i={2} mini={mini} />
      <Stroke
        d="M194 46 V60 M186 60 H202 V74 H186 Z M446 46 V60 M438 60 H454 V74 H438 Z"
        i={3}
        mini={mini}
      />
      <Pulse mini={mini}>
        <path d="M188 74 L148 254 M200 74 L264 254" strokeDasharray="4 6" />
      </Pulse>
      <Pulse delay={1.2} mini={mini}>
        <path d="M440 74 L376 254 M452 74 L492 254" strokeDasharray="4 6" />
      </Pulse>
      {/* mic */}
      <Stroke d="M320 254 V176 M302 254 H338" i={4} mini={mini} />
      <Stroke
        d="M311 164 A9 12 0 1 0 329 164 A9 12 0 1 0 311 164"
        i={5}
        mini={mini}
      />
      {/* wedges */}
      <Stroke
        d="M150 254 L168 230 H212 L218 254 M422 254 L428 230 H472 L490 254"
        i={6}
        mini={mini}
      />
      {/* cable */}
      <Stroke d="M320 254 C320 280 260 276 240 300" i={7} mini={mini} faint />
    </>
  );
}

const BARS = Array.from({ length: 24 }, (_, i) => i);

function Sound({ mini }: { mini?: boolean }) {
  return (
    <>
      <Stroke d="M230 236 V140 A90 90 0 0 1 410 140 V236" mini={mini} />
      <Stroke d="M320 50 V236 M230 150 H410" i={1} mini={mini} faint />
      <Stroke d="M90 300 H550" i={2} mini={mini} />
      {BARS.map((i) => {
        const x = 104 + i * 18.5;
        const base = 18 + ((i * 37) % 46);
        if (mini)
          return <line key={i} x1={x} x2={x} y1={286} y2={286 - base * 0.8} />;
        return (
          <motion.line
            key={i}
            x1={x}
            x2={x}
            y1={286}
            initial={{ y2: 286 }}
            animate={{ y2: [286 - base * 0.4, 286 - base, 286 - base * 0.55] }}
            transition={{
              duration: 1.1 + (i % 5) * 0.18,
              delay: 0.6 + i * 0.03,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
        );
      })}
    </>
  );
}
