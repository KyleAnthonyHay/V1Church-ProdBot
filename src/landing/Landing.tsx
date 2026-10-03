import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { BrandMark } from "@/components/Marks";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  FileText,
  MessageSquareText,
  Network,
  NotebookPen,
  TriangleAlert,
  ListChecks,
  BookOpen,
} from "lucide-react";

const APP_URL = "/app";
const DEMO_URL = "/app?demo";
const EASE = [0.22, 1, 0.36, 1] as const;
const SCROLL_ID = "landing-scroll";

/** The page scrolls inside #landing-scroll (html/body are fixed height). */
const scrollContainer = {
  get current() {
    return document.getElementById(SCROLL_ID);
  },
} as React.RefObject<HTMLElement>;

export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.title = "ProdBot · Production assistant for church tech teams";
  }, []);
  return (
    <div
      id={SCROLL_ID}
      className="bg-background text-foreground h-full overflow-x-hidden overflow-y-auto scroll-smooth"
    >
      <Nav />
      <main>
        <Hero />
        <Sunday />
        <Sources />
        <Watch />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1200px] px-5 md:px-10", className)}
    >
      {children}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      // Kinetics "stagger entrance": 14px rise and fade on an expo-out curve.
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px", root: scrollContainer }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** The one button that matters: teal, with a light sweep on hover. */
function PrimaryButton({
  href,
  children,
  className,
  onDark,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onDark?: boolean;
}) {
  // Kinetics-style magnetic pull: the button leans toward the cursor on a spring.
  const x = useSpring(0, { stiffness: 320, damping: 24, mass: 1 });
  const y = useSpring(0, { stiffness: 320, damping: 24, mass: 1 });
  return (
    <motion.a
      href={href}
      style={{ x, y }}
      // Kinetics "squish": quick press, overshooting release.
      whileTap={{ scale: 0.88, transition: { duration: 0.075 } }}
      transition={{ scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={cn(
        "group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full px-6 text-[15px] font-medium transition-shadow duration-300",
        onDark
          ? "bg-white text-black"
          : "bg-primary text-primary-foreground hover:shadow-[0_10px_30px_-10px_color-mix(in_oklch,var(--brand),transparent_35%)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
      />
      <span className="relative">{children}</span>
      <ArrowRight className="relative size-4 transition-transform duration-300 group-hover:translate-x-1" />
    </motion.a>
  );
}

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-[0_1px_2px_oklch(0.2_0.01_210/6%),0_24px_48px_-28px_oklch(0.2_0.03_210/35%)]">
      <img
        src={src}
        alt={alt}
        width={1440}
        height={900}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-auto w-full"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollContainer.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "bg-background/85 border-border backdrop-blur-xl"
          : "border-transparent",
      )}
    >
      <Container className="flex h-16 items-center gap-6">
        <a href="/" className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">
            ProdBot
          </span>
        </a>
        <div className="flex-1" />
        <a
          href="#sunday"
          className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline"
        >
          How it works
        </a>
        <a
          href={APP_URL}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Sign in
        </a>
        <a
          href={DEMO_URL}
          className="border-border hover:border-foreground/30 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
        >
          Try the demo
        </a>
      </Container>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

/** A clock that starts at 8:12:04 on a Sunday and keeps running. */
function useSundayClock() {
  const [s, setS] = useState(8 * 3600 + 12 * 60 + 4);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return {
    seconds: s,
    label: `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
    untilService: Math.max(0, Math.ceil((9 * 3600 - s) / 60)),
  };
}

function Hero() {
  const clock = useSundayClock();
  return (
    <section className="relative">
      <Container className="pt-10 pb-16 md:pt-16 md:pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] tabular-nums"
        >
          <span className="text-foreground font-medium">
            Sunday {clock.label} AM
          </span>
          <span>Doors 8:00</span>
          <span>Service 9:00</span>
        </motion.div>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="text-[46px] leading-[0.98] font-medium tracking-[-0.045em] md:text-[72px]"
            >
              The click just dropped out.{" "}
              <span className="text-muted-foreground/70">
                Service is in {clock.untilService} minutes.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
              className="text-muted-foreground mt-7 max-w-[440px] text-[17px] leading-relaxed"
            >
              ProdBot knows how your church is wired. A volunteer describes
              what's wrong in plain words and gets the fix your team already
              wrote down, step by step, before anyone has to call the production
              lead.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-6"
            >
              <PrimaryButton href={DEMO_URL}>Try the demo</PrimaryButton>
              <a
                href="#watch"
                className="text-foreground group inline-flex items-center gap-1.5 text-[15px] font-medium"
              >
                Watch a Sunday in 30 seconds
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: EASE }}
          >
            <AgentConsole />
          </motion.div>
        </div>

        <RunOfShow seconds={clock.seconds} />
      </Container>
    </section>
  );
}

/** Horizontal run of show, 6:45 to 9:45, with a playhead at "now". */
function RunOfShow({ seconds }: { seconds: number }) {
  const start = 6.75 * 3600;
  const end = 9.75 * 3600;
  const pct = (t: number) => ((t - start) / (end - start)) * 100;
  const marks = [
    { t: 7 * 3600, label: "Power on" },
    { t: 7.33 * 3600, label: "Line check" },
    { t: 8 * 3600, label: "Doors" },
    { t: 8.25 * 3600, label: "Rehearsal" },
    { t: 9 * 3600, label: "Service" },
  ];
  return (
    <div className="mt-16 hidden md:block">
      <div className="relative h-12">
        <div className="bg-border absolute inset-x-0 top-6 h-px" />
        {Array.from({ length: 13 }, (_, i) => start + i * 900).map((t) => (
          <div
            key={t}
            className="bg-border absolute top-[20px] h-2 w-px"
            style={{ left: `${pct(t)}%` }}
          />
        ))}
        {marks.map((m) => (
          <div
            key={m.label}
            className="absolute top-0 -translate-x-1/2 text-center"
            style={{ left: `${pct(m.t)}%` }}
          >
            <div className="text-muted-foreground text-[11px] whitespace-nowrap">
              {m.label}
            </div>
            <div className="bg-foreground/50 mx-auto mt-[9px] size-1.5 rounded-full" />
          </div>
        ))}
        <motion.div
          className="absolute top-3 -translate-x-1/2"
          style={{ left: `${pct(seconds)}%` }}
        >
          <div className="bg-primary h-6 w-[2px] rounded-full" />
          <div className="bg-primary/20 absolute -inset-x-1.5 -inset-y-0.5 animate-pulse rounded-full" />
        </motion.div>
      </div>
    </div>
  );
}

/* ---- Agent console ------------------------------------------------- */

type Scenario = {
  question: string;
  /** Beautiful UI-style step trace shown while it thinks. */
  trace: string[];
  /** Context the answer came from. */
  sources: { kind: string; title: string }[];
  path: string[];
  checks: string[];
};

// Grounded in the demo church's Downtown wiring and pitfalls.
const SCENARIOS: Scenario[] = [
  {
    question: "The drummer has no click in his ears.",
    trace: [
      "Read the Downtown wiring",
      "Matched pitfall P-002",
      "Checked runbook step 3",
    ],
    sources: [
      { kind: "Pitfall", title: "P-002 · last seen Sep 21" },
      { kind: "Wiring", title: "Downtown · 22 devices" },
    ],
    path: [
      "Playback Mac",
      "Clarett out 3",
      "Stage box A · In 15",
      "LV1 ch 15",
      "Aux 1",
      "Drummer IEM",
    ],
    checks: [
      "Ableton output is the Clarett+, not the Mac speakers",
      "Click track routed to output 3",
      "LV1 ch 15 is metering and up in Aux 1",
    ],
  },
  {
    question: "Everything from FOH sounds glitchy, almost 8-bit.",
    trace: [
      "Read the Downtown wiring",
      "Matched pitfall P-001",
      "Checked the systems sheet",
    ],
    sources: [
      { kind: "Pitfall", title: "P-001 · last seen Sep 14" },
      { kind: "Systems", title: "Extreme Server-C" },
    ],
    path: [
      "Stage box A",
      "SoundGrid switch",
      "SoundGrid server",
      "FOH console",
    ],
    checks: [
      "Setup → Inventory: server shows Assigned",
      "Clock Master is the Extreme server, not Internal",
      "Re-save the show file once it sounds right",
    ],
  },
  {
    question: "Lead vocal keeps cutting out during worship.",
    trace: [
      "Read the Downtown wiring",
      "Matched pitfall P-004",
      "Checked runbook step 5",
    ],
    sources: [
      { kind: "Pitfall", title: "P-004 · last seen Sep 7" },
      { kind: "Runbook", title: "7:30 · fresh batteries" },
    ],
    path: ["Vocal pack", "ULXD4Q receiver", "Rack IOX · In 1", "LV1 ch 17"],
    checks: [
      "Pack shows fewer than 3 battery bars",
      "RF meter drops near the stage edge",
      "Fresh batteries, or rescan and deploy a new group",
    ],
  },
];

/** Typing → sent → thinking → path → checks → source → hold, then next. */
function AgentConsole() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [stage, setStage] = useState(0);
  const [typed, setTyped] = useState(0);
  const s = SCENARIOS[i]!;

  useEffect(() => {
    if (reduce) {
      setTyped(s.question.length);
      setStage(99);
      return;
    }
    setStage(0);
    setTyped(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 500;
    for (let k = 1; k <= s.question.length; k++) {
      timers.push(setTimeout(() => setTyped(k), t));
      t += 34;
    }
    const at = (ms: number, st: number) =>
      timers.push(setTimeout(() => setStage(st), ms));
    at((t += 450), 1); // sent
    at((t += 500), 2); // thinking
    t += 1700;
    s.path.forEach((_, k) => at(t + k * 260, 3 + k)); // path hops
    t += s.path.length * 260 + 300;
    const base = 3 + s.path.length;
    s.checks.forEach((_, k) => at(t + k * 420, base + k)); // checks
    t += s.checks.length * 420 + 300;
    at(t, base + s.checks.length); // source
    timers.push(
      setTimeout(() => setI((x) => (x + 1) % SCENARIOS.length), t + 4200),
    );
    return () => timers.forEach(clearTimeout);
  }, [i, reduce, s]);

  const hops = Math.max(0, Math.min(s.path.length, stage - 2));
  const checks = Math.max(
    0,
    Math.min(s.checks.length, stage - 2 - s.path.length),
  );
  const done = stage >= 3 + s.path.length + s.checks.length;

  return (
    <div className="border-border bg-card relative flex h-[500px] flex-col overflow-hidden rounded-[20px] border shadow-[0_1px_2px_oklch(0.2_0.01_210/5%),0_40px_80px_-40px_oklch(0.2_0.04_210/35%)]">
      <div className="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <BrandMark size={20} active={stage >= 2 && !done} />
        <span className="text-sm font-medium">ProdBot</span>
        <span className="text-muted-foreground text-sm">Downtown</span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {SCENARIOS.map((_, k) => (
            <span
              key={k}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                k === i ? "bg-foreground/70 w-5" : "bg-border w-1.5",
              )}
            />
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden px-4 py-5 md:px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="space-y-4"
          >
            {stage >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-[14px]"
              >
                {s.question}
              </motion.div>
            )}

            {stage >= 2 && (
              <div className="flex gap-3">
                <BrandMark size={20} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-3">
                  <ThinkingTrace steps={s.trace} collapsed={hops > 0} />

                  {hops > 0 && (
                    <div className="flex flex-wrap items-center gap-y-1.5">
                      {s.path.slice(0, hops).map((p, k) => (
                        <motion.span
                          key={p}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center"
                        >
                          {k > 0 && (
                            <span className="bg-border mx-1 h-px w-3" />
                          )}
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[12px] whitespace-nowrap",
                              k === hops - 1 && !done && checks === 0
                                ? "border-primary/50 text-foreground"
                                : "border-border text-foreground/80",
                            )}
                          >
                            {p}
                          </span>
                        </motion.span>
                      ))}
                    </div>
                  )}

                  {checks > 0 && (
                    <ol className="space-y-2 pt-1">
                      {s.checks.slice(0, checks).map((c, k) => (
                        <motion.li
                          key={c}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2.5 text-[14px] leading-snug"
                        >
                          <span className="border-border text-muted-foreground mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums">
                            {k + 1}
                          </span>
                          {c}
                        </motion.li>
                      ))}
                    </ol>
                  )}

                  {done && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-2 pt-1"
                    >
                      {s.sources.map((src) => (
                        <span
                          key={src.title}
                          className="border-border bg-background flex items-center gap-2 rounded-lg border px-2 py-1"
                        >
                          <BookOpen className="text-muted-foreground size-3" />
                          <span className="text-muted-foreground text-[11px]">
                            {src.kind}
                          </span>
                          <span className="text-[12px]">{src.title}</span>
                        </span>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 pb-4">
        <div className="border-border flex items-center gap-3 rounded-2xl border py-2 pr-2 pl-4">
          <span className="min-w-0 flex-1 truncate text-[14px]">
            {stage === 0 ? (
              <>
                {s.question.slice(0, typed)}
                <span className="bg-foreground/60 ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse" />
              </>
            ) : (
              <span className="text-muted-foreground">Message ProdBot</span>
            )}
          </span>
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full transition-colors",
              stage === 0 && typed === s.question.length
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUp className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Beautiful UI-style thinking trace: steps tick off one by one, then the
 * trace collapses to a single "Thought for…" line once the answer starts.
 */
function ThinkingTrace({
  steps,
  collapsed,
}: {
  steps: string[];
  collapsed: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const timers = steps.map((_, k) =>
      setTimeout(() => setN(k + 1), 380 + k * 480),
    );
    return () => timers.forEach(clearTimeout);
  }, [steps]);
  if (collapsed)
    return (
      <div className="text-muted-foreground flex items-center gap-1 text-[12px]">
        Thought for 2s · {steps.length} steps
        <ChevronRight className="size-3" />
      </div>
    );
  return (
    <div className="space-y-1.5">
      <ShimmeringText
        text="Thinking"
        className="text-[13px]"
        startOnView={false}
      />
      {steps.slice(0, n + 1).map((step, k) => (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-muted-foreground flex items-center gap-2 text-[12px]"
        >
          {k < n ? (
            <Check className="text-primary size-3" strokeWidth={3} />
          ) : (
            <span className="border-muted-foreground/40 border-t-foreground size-3 animate-spin rounded-full border" />
          )}
          {step}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A Sunday, minute by minute                                         */
/* ------------------------------------------------------------------ */

type Moment = {
  time: string;
  minute: number;
  feature: string;
  title: string;
  body: string;
  visual: ReactNode;
};

const MOMENTS: Moment[] = [
  {
    time: "7:00",
    minute: 7 * 60,
    feature: "Runbook",
    title: "Power on, in the right order",
    body: "Today's checklist comes from the campus runbook. Each step says who owns it, what done looks like, and which pitfall to open if it isn't.",
    visual: <RunbookVisual />,
  },
  {
    time: "7:12",
    minute: 7 * 60 + 12,
    feature: "Ask",
    title: "Something goes quiet",
    body: "A volunteer asks in their own words. ProdBot walks the documented signal chain and answers with the checks to run, closest to the problem first.",
    visual: (
      <Shot
        src="/landing/chat.webp"
        alt="ProdBot answering why the drummer has no click"
      />
    ),
  },
  {
    time: "7:31",
    minute: 7 * 60 + 31,
    feature: "Explore",
    title: "Where does that cable go?",
    body: "Every device and connection on one diagram. Click one to see what feeds it, where its signal goes next, and the pitfalls that have hit it before.",
    visual: (
      <Shot
        src="/landing/explore-focus.webp"
        alt="The Downtown wiring diagram with the SoundGrid server in focus"
      />
    ),
  },
  {
    time: "8:05",
    minute: 8 * 60 + 5,
    feature: "Pitfalls",
    title: "It's happened before",
    body: "Problems are written down symptom-first, the way someone describes them on a Sunday, with what was actually wrong and what fixed it.",
    visual: <PitfallVisual />,
  },
  {
    time: "10:40",
    minute: 10 * 60 + 40,
    feature: "Admin",
    title: "After service, write it down",
    body: "A volunteer reports what fixed it. An admin approves it in one click and the pitfall's last-seen date updates for next week's team.",
    visual: <FixVisual />,
  },
];

function Sunday() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: scrollContainer,
    offset: ["start 60%", "end 60%"],
  });
  const [active, setActive] = useState(0);
  const rail = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const m = MOMENTS[active]!;

  return (
    <section id="sunday" className="border-border scroll-mt-16 border-t">
      <Container className="pt-24 md:pt-32">
        <Reveal>
          <h2 className="max-w-3xl text-[36px] leading-[1.02] font-medium tracking-[-0.04em] md:text-[56px]">
            A Sunday, minute by minute.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-[17px] leading-relaxed">
            Every church runs the same morning a little differently. ProdBot
            learns yours, campus by campus, and shows up at the moments that
            usually go wrong.
          </p>
        </Reveal>

        <div
          ref={ref}
          className="mt-16 grid gap-10 pb-24 lg:grid-cols-[260px_1fr] lg:gap-16"
        >
          {/* Sticky clock */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="text-[88px] leading-none font-medium tracking-[-0.05em] tabular-nums">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={m.time}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="inline-block"
                  >
                    {m.time}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="text-muted-foreground mt-3 text-sm">
                {m.minute >= 10 * 60 ? "After service" : "AM"} ·{" "}
                <span className="text-foreground">{m.feature}</span>
              </div>
              <div className="bg-border relative mt-8 h-48 w-px">
                <motion.div
                  className="bg-primary absolute inset-x-0 top-0"
                  style={{ height: rail }}
                />
              </div>
            </div>
          </div>

          {/* Moments */}
          <div className="space-y-24 md:space-y-32">
            {MOMENTS.map((mo, k) => (
              <MomentRow key={mo.time} onActive={() => setActive(k)}>
                <Reveal>
                  <div className="text-muted-foreground flex items-baseline gap-3 text-sm tabular-nums">
                    <span className="text-foreground lg:hidden">{mo.time}</span>
                    {mo.feature}
                  </div>
                  <h3 className="mt-2 text-[26px] leading-tight font-medium tracking-[-0.03em] md:text-[30px]">
                    {mo.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-[16px] leading-relaxed">
                    {mo.body}
                  </p>
                </Reveal>
                <Reveal delay={0.1}>{mo.visual}</Reveal>
              </MomentRow>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** A timeline row that marks itself active when it crosses mid-screen. */
function MomentRow({
  children,
  onActive,
}: {
  children: ReactNode;
  onActive: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    root: scrollContainer,
    margin: "-40% 0px -50% 0px",
  });
  useEffect(() => {
    if (inView) onActive();
  }, [inView, onActive]);
  return (
    <div
      ref={ref}
      className="grid gap-8 md:grid-cols-[1fr_1.35fr] md:items-center"
    >
      {children}
    </div>
  );
}

/* ---- Moment visuals (drawn from the demo church) ------------------- */

function VisualCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-2xl border p-5 shadow-[0_1px_2px_oklch(0.2_0.01_210/5%),0_24px_48px_-30px_oklch(0.2_0.03_210/30%)] md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function RunbookVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, root: scrollContainer });
  const steps = [
    [
      "7:00",
      "Rack conditioner, switch, then SoundGrid server",
      "Production lead",
    ],
    ["7:05", "Start the LV1 and load the Sunday show", "A1"],
    ["7:15", "Open Ableton and play the click", "Playback"],
    ["7:20", "Line check drums, bass and keys", "A1"],
  ];
  return (
    <VisualCard>
      <div ref={ref} className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ListChecks className="size-4" /> Downtown runbook
        </div>
        <span className="text-muted-foreground text-xs">Today</span>
      </div>
      <ul className="divide-border mt-4 divide-y">
        {steps.map(([time, step, owner], k) => {
          const checked = inView && k < 3;
          return (
            <li key={step} className="flex items-center gap-3 py-3">
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: checked ? "var(--primary)" : "rgba(0,0,0,0)",
                  borderColor: checked ? "var(--primary)" : "var(--border)",
                }}
                transition={{ delay: 0.3 + k * 0.45, duration: 0.25 }}
                className="text-primary-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-md border"
              >
                {checked && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.35 + k * 0.45 }}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
              </motion.span>
              <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">
                {time}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-[14px]",
                  checked && "text-muted-foreground",
                )}
              >
                {step}
              </span>
              <span className="text-muted-foreground hidden text-xs sm:inline">
                {owner}
              </span>
            </li>
          );
        })}
      </ul>
    </VisualCard>
  );
}

function PitfallVisual() {
  return (
    <VisualCard>
      <div className="flex items-start gap-3">
        <span className="border-border inline-flex size-9 shrink-0 items-center justify-center rounded-xl border">
          <TriangleAlert className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-muted-foreground font-mono text-xs">P-004</div>
          <div className="text-[16px] font-medium">
            Lead vocal drops out during worship
          </div>
        </div>
      </div>
      <dl className="mt-5 space-y-3 text-[14px]">
        <div>
          <dt className="text-muted-foreground text-xs">
            What's actually wrong
          </dt>
          <dd className="mt-0.5">
            Low pack battery, or the frequency collides with a TV station on 584
            MHz.
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Check</dt>
          <dd className="mt-0.5">
            Battery bars on the pack, then the receiver's RF meter near the
            stage edge.
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Fix</dt>
          <dd className="mt-0.5">
            Fresh batteries every service. Still dropping? Rescan and deploy a
            new group.
          </dd>
        </div>
      </dl>
      <div className="border-border text-muted-foreground mt-5 flex flex-wrap items-center gap-2 border-t pt-4 text-xs">
        <span className="border-border rounded-md border px-1.5 py-0.5">
          Vocal wireless receiver
        </span>
        <span className="border-border rounded-md border px-1.5 py-0.5">
          Rack IOX
        </span>
        <span className="ml-auto">Last seen Sep 7</span>
      </div>
    </VisualCard>
  );
}

function FixVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, root: scrollContainer });
  const [approved, setApproved] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setApproved(true), 1800);
    return () => clearTimeout(t);
  }, [inView]);
  return (
    <VisualCard>
      <div ref={ref} className="text-muted-foreground text-xs">
        Reported fix · P-001
      </div>
      <blockquote className="mt-3 text-[15px] leading-relaxed">
        “P-001 happened again at 9am. Re-assigning the server in Inventory and
        setting the clock to the Extreme fixed it.”
      </blockquote>
      <div className="text-muted-foreground mt-2 text-xs">
        Volunteer, Downtown, 9:04 AM
      </div>
      <div className="border-border mt-5 flex items-center gap-3 border-t pt-4">
        <AnimatePresence mode="wait" initial={false}>
          {approved ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm"
            >
              <span className="bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full">
                <Check className="size-3" strokeWidth={3} />
              </span>
              Approved · P-001 last seen today
            </motion.div>
          ) : (
            <motion.div
              key="ask"
              exit={{ opacity: 0, y: -6 }}
              className="flex w-full items-center gap-2"
            >
              <span className="text-muted-foreground flex-1 text-sm">
                Add this to P-001?
              </span>
              <span className="border-border rounded-full border px-3 py-1 text-sm">
                Reject
              </span>
              <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm">
                Approve
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </VisualCard>
  );
}

/* ------------------------------------------------------------------ */
/* Sources: what it knows, your team wrote                            */
/* ------------------------------------------------------------------ */

const INPUTS = [
  {
    icon: NotebookPen,
    label: "Booth notes",
    detail: "“Rescanned the ULXD, moved to group 4…”",
  },
  {
    icon: FileText,
    label: "Manuals and PDFs",
    detail: "Rack drawings, console docs",
  },
  {
    icon: MessageSquareText,
    label: "A description",
    detail: "“Drums are on stage box A…”",
  },
];
const OUTPUTS = [
  { icon: Network, label: "Wiring diagram" },
  { icon: TriangleAlert, label: "Pitfalls" },
  { icon: ListChecks, label: "Runbook" },
  { icon: BookOpen, label: "Glossary" },
];

function Sources() {
  return (
    <section className="bg-brand-deep text-white">
      <Container className="py-24 md:py-32">
        <Reveal>
          <h2 className="max-w-3xl text-[36px] leading-[1.02] font-medium tracking-[-0.04em] md:text-[56px]">
            It only knows what your team wrote down.
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/65">
            Give it notes, PDFs or a plain description. The AI drafts the
            documents, an admin approves them, and nothing reaches a volunteer
            before that. If it isn't documented, ProdBot says so.
          </p>
        </Reveal>

        <div className="mt-16 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-10">
          <div className="space-y-3">
            {INPUTS.map((x, k) => (
              <Reveal key={x.label} delay={k * 0.09}>
                <div className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
                  <x.icon className="mt-0.5 size-4 shrink-0 text-white/70" />
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium">{x.label}</div>
                    <div className="truncate text-[13px] text-white/50">
                      {x.detail}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2} className="flex flex-col items-center gap-3 py-4">
            <Flow />
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pr-4 pl-1.5 text-sm">
              <BrandMark size={24} className="bg-white text-black" />
              Draft, then approve
            </div>
            <Flow />
          </Reveal>

          <div className="grid grid-cols-2 gap-3">
            {OUTPUTS.map((x, k) => (
              <Reveal key={x.label} delay={0.27 + k * 0.09}>
                <div className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-white p-4 text-black">
                  <x.icon className="size-4" />
                  <div className="text-[15px] font-medium">{x.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** A short vertical (desktop: horizontal) dashed line with moving signal. */
function Flow() {
  return (
    <svg viewBox="0 0 2 40" className="h-10 w-0.5 text-white/40" aria-hidden>
      <line
        x1="1"
        y1="0"
        x2="1"
        y2="40"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="3 4"
        className="animate-[dash_1.2s_linear_infinite]"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Watch                                                               */
/* ------------------------------------------------------------------ */

/** Chapters of public/landing/preview.mp4 (a recording of the demo church). */
const CHAPTERS = [
  { start: 0, title: "Ask a question" },
  { start: 11.9, title: "Explore the wiring" },
  { start: 19.5, title: "Review in Admin" },
];

function Watch() {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(31);
  const active = CHAPTERS.reduce((a, c, i) => (time >= c.start ? i : a), 0);
  const end = (i: number) => CHAPTERS[i + 1]?.start ?? duration;
  return (
    <section id="watch" className="scroll-mt-16">
      <Container className="py-24 md:py-32">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[36px] leading-[1.02] font-medium tracking-[-0.04em] md:text-[56px]">
            Watch a Sunday in 30 seconds.
          </h2>
          <span className="text-muted-foreground text-sm">
            Recorded in the demo church
          </span>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <div className="border-border bg-card overflow-hidden rounded-[20px] border shadow-[0_40px_80px_-40px_oklch(0.2_0.04_210/35%)]">
            <video
              ref={video}
              src="/landing/preview.mp4"
              poster="/landing/preview-poster.webp"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="ProdBot walkthrough: asking a question, exploring the wiring diagram and reviewing in Admin"
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              className="block aspect-[16/10] h-auto w-full"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 md:gap-6">
            {CHAPTERS.map((c, i) => {
              const on = i === active;
              const p = on
                ? Math.min(1, (time - c.start) / (end(i) - c.start))
                : i < active
                  ? 1
                  : 0;
              return (
                <button
                  key={c.title}
                  onClick={() => {
                    const v = video.current;
                    if (!v) return;
                    v.currentTime = c.start + 0.05;
                    void v.play().catch(() => {});
                  }}
                  className="group text-left"
                >
                  <span className="bg-border relative block h-[2px] overflow-hidden rounded-full">
                    <span
                      className="bg-foreground absolute inset-y-0 left-0 block"
                      style={{ width: `${p * 100}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "mt-3 block text-sm transition-colors",
                      on
                        ? "text-foreground font-medium"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {c.title}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing                                                             */
/* ------------------------------------------------------------------ */

function Closing() {
  return (
    <section className="border-border border-t">
      <Container className="py-24 md:py-36">
        <Reveal className="flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
          <h2 className="text-[56px] leading-[0.95] font-medium tracking-[-0.05em] md:text-[104px]">
            See you
            <br />
            Sunday.
          </h2>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <PrimaryButton href={DEMO_URL}>Try the demo</PrimaryButton>
            <a
              href={APP_URL}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Or sign in to your church
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center">
        <div className="text-foreground flex items-center gap-2">
          <BrandMark size={18} />
          <span className="font-medium">ProdBot</span>
        </div>
        <span>The production assistant for church tech teams.</span>
      </Container>
    </footer>
  );
}
