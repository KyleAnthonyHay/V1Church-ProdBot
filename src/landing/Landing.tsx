import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { Orb, type OrbPalette } from "@/components/Orb";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  History,
  ListChecks,
  MapPin,
  MessageSquare,
  MousePointerClick,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

const APP_URL = "/app";
const EASE = [0.22, 1, 0.36, 1] as const;
const SCROLL_ID = "landing-scroll";

export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.title = "ProdBot · V1 Church production assistant";
  }, []);
  return (
    <div
      id={SCROLL_ID}
      className="bg-background text-foreground h-full overflow-x-hidden overflow-y-auto scroll-smooth"
    >
      <Nav />
      <main>
        <Hero />
        <Systems />
        <Platform />
        <AskSection />
        <ExploreSection />
        <AdminSection />
        <ThemeSection />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** The page scrolls inside #landing-scroll (html/body are fixed height). */
const scrollContainer = {
  get current() {
    return document.getElementById(SCROLL_ID);
  },
} as React.RefObject<HTMLElement>;

function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px", root: scrollContainer }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1180px] px-5 md:px-8", className)}
    >
      {children}
    </div>
  );
}

function PillLink({
  href,
  children,
  variant = "dark",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "dark" | "light";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-all duration-300",
        variant === "dark"
          ? "bg-foreground text-background hover:shadow-[0_8px_24px_-8px_oklch(0.2_0.01_60/45%)]"
          : "bg-card border-border hover:border-ring/50 border",
        className,
      )}
    >
      {children}
    </a>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-end">
      <Reveal>
        <div className="text-muted-foreground mb-4 flex items-center gap-2 text-[13px] font-medium">
          {eyebrow}
        </div>
        <h2 className="text-[34px] leading-[1.08] font-medium tracking-[-0.035em] md:text-[44px]">
          {title}
        </h2>
      </Reveal>
      <Reveal delay={0.1} className="flex flex-col items-start gap-5 md:pb-1">
        {body && (
          <p className="text-muted-foreground max-w-md text-[15px] leading-relaxed">
            {body}
          </p>
        )}
        {action}
      </Reveal>
    </div>
  );
}

/** A screenshot of the real app in a soft frame. */
function Shot({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border shadow-[0_1px_2px_oklch(0.2_0.01_60/6%),0_30px_60px_-30px_oklch(0.2_0.01_60/30%)]",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={1440}
        height={900}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="block h-auto w-full"
      />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="group bg-muted/70 hover:bg-muted flex h-full flex-col rounded-2xl p-6 transition-colors duration-300">
        <Icon className="text-foreground/80 size-[18px] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" />
        <div className="mt-14 text-[13px] font-medium">{title}</div>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          {body}
        </p>
      </div>
    </Reveal>
  );
}

function Dot({ color }: { color: string }) {
  return <span className={cn("inline-block size-1.5 rounded-full", color)} />;
}

const ASK_COLOR = "bg-[oklch(0.68_0.19_35)]";
const EXPLORE_COLOR = "bg-[oklch(0.62_0.2_290)]";
const ADMIN_COLOR = "bg-[oklch(0.7_0.12_200)]";

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
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "bg-background/80 border-border backdrop-blur-xl"
          : "border-transparent",
      )}
    >
      <Container className="flex h-16 items-center gap-8">
        <a href="/" className="flex items-center gap-2.5">
          <Orb size={24} blur={4} />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">
            ProdBot
          </span>
        </a>
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
          {["Ask", "Explore", "Admin"].map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase()}`}
              className="hover:text-foreground transition-colors"
            >
              {s}
            </a>
          ))}
        </nav>
        <div className="flex-1" />
        <PillLink
          href="#platform"
          variant="light"
          className="hidden h-9 sm:inline-flex"
        >
          How it works
        </PillLink>
        <PillLink href={APP_URL} className="h-9">
          Open ProdBot
        </PillLink>
      </Container>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const CAMPUSES: {
  name: string;
  palette: OrbPalette;
  line: string;
  question: string;
}[] = [
  {
    name: "Brooklyn",
    palette: "ember",
    line: "Wiring diagram on file",
    question: "Walk me through the Sunday setup order.",
  },
  {
    name: "Manhattan",
    palette: "aurora",
    line: "Its own docs, its own answers",
    question: "What is documented for this campus?",
  },
  {
    name: "Long Island",
    palette: "lagoon",
    line: "Pitfalls written symptom-first",
    question: "The drummer has no click in his ears. What do I check first?",
  },
  {
    name: "Miami",
    palette: "citrus",
    line: "Every device, searchable",
    question: "What happens if the SoundGrid server drops off the network?",
  },
  {
    name: "Indiana",
    palette: "dusk",
    line: "Glossary shared across campuses",
    question: "What does FOH stand for?",
  },
];

const MODES = [
  { id: "ask", label: "Ask", color: ASK_COLOR },
  { id: "explore", label: "Explore", color: EXPLORE_COLOR },
  { id: "admin", label: "Admin", color: ADMIN_COLOR },
] as const;
type Mode = (typeof MODES)[number]["id"];

const TOPICS = [
  "Troubleshoot",
  "Sunday setup",
  "Signal chain",
  "Glossary",
  "Wiring",
  "Pitfalls",
];

function Hero() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("ask");
  const [paused, setPaused] = useState(false);
  const n = CAMPUSES.length;
  useEffect(() => {
    if (paused || mode !== "ask") return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 4200);
    return () => clearInterval(t);
  }, [paused, mode, n]);
  const go = (d: number) => setIndex((i) => (i + d + n) % n);
  const active = CAMPUSES[index]!;

  return (
    <section className="relative pt-14 md:pt-20">
      <Container>
        <div className="grid gap-6 md:grid-cols-[1.15fr_1fr] md:items-end md:gap-8">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE }}
            className="text-[44px] leading-[1.02] font-medium tracking-[-0.045em] md:text-[68px]"
          >
            Sunday production,{" "}
            <span className="font-serif font-normal tracking-[-0.01em] italic">
              answered.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: EASE }}
            className="text-muted-foreground max-w-md text-[15px] leading-relaxed md:pb-2"
          >
            ProdBot is the production assistant for V1 Church. It reads each
            campus's wiring, pitfalls and runbook, then answers volunteers in
            plain language when something goes quiet.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: EASE }}
          className="mt-7 flex flex-wrap gap-2.5"
        >
          <PillLink href={APP_URL}>
            Open ProdBot
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </PillLink>
          <PillLink href="#platform" variant="light">
            See how it works
          </PillLink>
        </motion.div>

        {/* Showcase panel */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
          className="bg-muted/80 relative mt-12 overflow-hidden rounded-[28px] p-2 md:mt-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative grid grid-cols-3 gap-1">
            {MODES.map((m) => {
              const on = m.id === mode;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "relative flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-medium transition-colors",
                    on
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="mode-pill"
                      className="bg-card absolute inset-0 rounded-2xl shadow-[var(--shadow-soft)]"
                      transition={{
                        type: "spring",
                        bounce: 0.18,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative">
                    <Dot color={m.color} />
                  </span>
                  <span className="relative">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative h-[440px] md:h-[520px]">
            <AnimatePresence mode="wait">
              {mode === "ask" && (
                <motion.div
                  key="ask"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <OrbCarousel index={index} onPick={setIndex} />
                  <div className="absolute inset-x-0 top-[262px] flex flex-col items-center px-4 text-center md:top-[330px]">
                    <div className="flex items-center gap-4">
                      <button
                        aria-label="Previous campus"
                        onClick={() => go(-1)}
                        className="text-muted-foreground hover:text-foreground hover:bg-card rounded-full p-1.5 transition-colors"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={active.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="w-52"
                        >
                          <div className="text-[15px] font-medium">
                            {active.name}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs">
                            {active.line}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                      <button
                        aria-label="Next campus"
                        onClick={() => go(1)}
                        className="text-muted-foreground hover:text-foreground hover:bg-card rounded-full p-1.5 transition-colors"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                    <TypedQuestion text={active.question} />
                  </div>
                </motion.div>
              )}
              {mode === "explore" && (
                <PanelShot
                  key="explore"
                  src="/landing/explore-focus.webp"
                  alt="ProdBot Explore: the Brooklyn wiring diagram with a focused device"
                />
              )}
              {mode === "admin" && (
                <PanelShot
                  key="admin"
                  src="/landing/admin.webp"
                  alt="ProdBot Admin: adding campus documentation"
                />
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex items-center justify-center gap-1.5 px-2 pb-2 md:justify-between">
            <div className="hidden flex-wrap gap-1 md:flex">
              {TOPICS.map((t, i) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[13px]",
                    i === 0
                      ? "bg-card font-medium shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <PillLink href={APP_URL} className="h-9 px-4">
              Try it
            </PillLink>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

function PanelShot({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-start justify-center overflow-hidden px-3 pt-4 md:px-10 md:pt-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Shot src={src} alt={alt} className="w-full max-w-[900px]" />
    </motion.div>
  );
}

/** Campus orbs on a rail; the active one sits front and centre. */
function OrbCarousel({
  index,
  onPick,
}: {
  index: number;
  onPick: (i: number) => void;
}) {
  const n = CAMPUSES.length;
  const [wide, setWide] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768,
  );
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const size = wide ? 190 : 150;
  const gap = wide ? 190 : 120;
  return (
    <div className="absolute inset-x-0 top-6 h-[230px] md:top-10 md:h-[290px]">
      {CAMPUSES.map((c, i) => {
        // Signed distance from the active slot, wrapped to [-2, 2].
        let d = i - index;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        const center = d === 0;
        const abs = Math.abs(d);
        return (
          <motion.button
            key={c.name}
            aria-label={center ? `Open ProdBot` : `Show ${c.name}`}
            onClick={() =>
              center ? (window.location.href = APP_URL) : onPick(i)
            }
            className="group absolute top-1/2 left-1/2 -mt-[var(--h)] -ml-[var(--h)]"
            style={{ ["--h" as string]: `${size / 2}px`, zIndex: 10 - abs }}
            initial={false}
            animate={{
              x: d * gap,
              scale: center ? 1 : abs === 1 ? 0.7 : 0.48,
              opacity: center ? 1 : abs === 1 ? 0.9 : 0.4,
              filter: abs >= 2 ? "blur(3px)" : "blur(0px)",
            }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
          >
            <Orb
              size={size}
              palette={c.palette}
              blur={14}
              speed={center ? 9 : 16}
              active={center}
              className="shadow-[0_30px_60px_-25px_oklch(0.4_0.1_30/45%)]"
            />
            <AnimatePresence>
              {center && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition-transform duration-300 group-hover:scale-110"
                >
                  <ArrowUp className="size-5 rotate-45" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

function TypedQuestion({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const t = setInterval(
      () =>
        setCount((c) => {
          if (c >= text.length) clearInterval(t);
          return Math.min(c + 1, text.length);
        }),
      28,
    );
    return () => clearInterval(t);
  }, [text]);
  return (
    <div className="bg-card mt-5 flex w-full max-w-lg items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-left shadow-[var(--shadow-soft)]">
      <span className="min-w-0 flex-1 truncate text-sm">
        {text.slice(0, count)}
        <span className="bg-foreground/70 ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse" />
      </span>
      <a
        href={APP_URL}
        aria-label="Ask ProdBot"
        className="bg-foreground text-background inline-flex size-8 shrink-0 items-center justify-center rounded-full"
      >
        <ArrowUp className="size-4" />
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Systems strip                                                       */
/* ------------------------------------------------------------------ */

const SYSTEMS = [
  "Waves LV1",
  "SoundGrid",
  "Ableton Live",
  "Focusrite Clarett",
  "In-ear monitors",
  "Stage racks",
  "Front of house",
  "XLR · Ethernet",
];

function Systems() {
  return (
    <section className="pt-20 md:pt-24">
      <Container>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[15px]">
            Speaks the language of your signal chain
          </p>
          <a
            href="#explore"
            className="bg-card border-border hover:border-ring/50 hidden rounded-full border px-4 py-1.5 text-[13px] transition-colors sm:inline-block"
          >
            See the wiring
          </a>
        </div>
        <div className="border-border relative mt-8 overflow-hidden border-y py-8 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="animate-marquee flex w-max gap-16 pr-16">
            {[...SYSTEMS, ...SYSTEMS].map((s, i) => (
              <span
                key={i}
                aria-hidden={i >= SYSTEMS.length}
                className="text-muted-foreground/70 text-xl font-medium tracking-[-0.02em] whitespace-nowrap"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Platform overview                                                   */
/* ------------------------------------------------------------------ */

function Platform() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: scrollContainer,
    offset: ["start end", "end start"],
  });
  const leftY = useTransform(scrollYProgress, [0, 1], [60, -40]);
  const rightY = useTransform(scrollYProgress, [0, 1], [120, -80]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.94, 1]);

  return (
    <section id="platform" className="scroll-mt-16 pt-28 md:pt-36">
      <Container>
        <Reveal>
          <h2 className="max-w-xl text-[34px] leading-[1.08] font-medium tracking-[-0.035em] md:text-[44px]">
            Three tools built on the{" "}
            <span className="font-serif font-normal italic">same</span> campus
            documentation
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              t: "Ask",
              c: ASK_COLOR,
              b: "Volunteers ask in plain language and get answers grounded in that campus's docs.",
            },
            {
              t: "Explore",
              c: EXPLORE_COLOR,
              b: "The whole signal chain as a live diagram you can search, focus and export.",
            },
            {
              t: "Admin",
              c: ADMIN_COLOR,
              b: "Describe the setup, let the AI draft it, and approve it when it's right.",
            },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 0.08}>
              <div className="flex items-center gap-2 text-[15px] font-medium">
                <Dot color={x.c} />
                {x.t}
              </div>
              <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed">
                {x.b}
              </p>
            </Reveal>
          ))}
        </div>

        <motion.div
          ref={ref}
          style={{ scale }}
          className="bg-muted/80 relative mt-12 h-[300px] overflow-hidden rounded-[28px] sm:h-[460px] md:h-[600px]"
        >
          <div className="pointer-events-none absolute -top-40 -left-40 opacity-60 blur-3xl">
            <Orb size={420} palette="ember" blur={60} speed={30} />
          </div>
          <div className="pointer-events-none absolute -right-32 -bottom-48 opacity-50 blur-3xl">
            <Orb size={460} palette="aurora" blur={70} speed={34} />
          </div>
          <motion.div
            style={{ y: leftY }}
            className="absolute top-8 left-[4%] w-[62%] md:top-14"
          >
            <Shot
              src="/landing/chat.webp"
              alt="A ProdBot answer walking through the Brooklyn Sunday setup order"
            />
          </motion.div>
          <motion.div
            style={{ y: rightY }}
            className="absolute top-24 right-[4%] w-[55%] md:top-40"
          >
            <Shot
              src="/landing/explore.webp"
              alt="The Brooklyn wiring diagram in ProdBot Explore"
            />
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ask                                                                 */
/* ------------------------------------------------------------------ */

// Condensed from a real answer against the Brooklyn dev documentation.
const CHAT_STEPS = [
  "Set up the Piano with Ableton",
  "Connect it to the Stage rack sound over SoundGrid",
  "Connect the Stage rack to the FOH Demo box",
  "Connect the FOH Demo box to the LV1 console",
  "Check the LV1 / SoundGrid status",
];

function AskSection() {
  return (
    <section id="ask" className="scroll-mt-16 pt-28 md:pt-40">
      <Container>
        <SectionHeading
          eyebrow={
            <>
              <Dot color={ASK_COLOR} />
              Ask
            </>
          }
          title={
            <>
              Troubleshoot in{" "}
              <span className="font-serif font-normal italic">plain</span>{" "}
              language
            </>
          }
          body="Ask what you'd ask the production lead. ProdBot walks the campus wiring, follows the runbook, and tells you what isn't documented instead of guessing."
          action={
            <PillLink href={APP_URL}>
              Ask a question
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </PillLink>
          }
        />

        <div className="mt-12 grid gap-3 md:grid-cols-2">
          <Reveal className="h-full">
            <LiveChatCard />
          </Reveal>
          <Reveal delay={0.1} className="h-full">
            <div className="bg-muted/80 group flex h-full min-h-[440px] flex-col overflow-hidden rounded-[22px]">
              <div className="relative flex-1 overflow-hidden">
                <div className="absolute top-8 left-8 w-[150%] transition-transform duration-700 group-hover:-translate-x-6 group-hover:-translate-y-2">
                  <Shot
                    src="/landing/ask.webp"
                    alt="ProdBot's Ask screen for the Brooklyn campus"
                  />
                </div>
              </div>
              <div className="p-6 pt-5">
                <div className="text-muted-foreground text-[13px]">
                  One home per campus
                </div>
                <p className="mt-1 text-sm leading-relaxed">
                  Pick your campus once. Every answer comes from that campus's
                  approved documents, with the shared glossary and links on top.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={Wrench}
            title="Troubleshoot"
            body="Describe the symptom and get the first thing to check."
          />
          <FeatureCard
            icon={ListChecks}
            title="Sunday setup"
            body="Step-by-step setup order from the campus documentation."
            delay={0.06}
          />
          <FeatureCard
            icon={Brain}
            title="Shows its thinking"
            body="A collapsible summary of how it reached the answer."
            delay={0.12}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Only what's documented"
            body="If it isn't in the docs, ProdBot says so rather than invent it."
            delay={0.18}
          />
        </div>
      </Container>
    </section>
  );
}

/** A replay of a real ProdBot answer, played when it scrolls into view. */
function LiveChatCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once: true,
    margin: "-120px",
    root: scrollContainer,
  });
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 1200),
      ...CHAT_STEPS.map((_, i) =>
        setTimeout(() => setStage(3 + i), 2500 + i * 420),
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div
      ref={ref}
      className="relative flex h-full min-h-[440px] flex-col justify-end overflow-hidden rounded-[22px] bg-[oklch(0.25_0.03_40)] text-white"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 opacity-90 blur-3xl">
        <Orb size={420} palette="ember" blur={50} speed={24} />
      </div>
      <div className="pointer-events-none absolute -bottom-40 -left-24 opacity-60 blur-3xl">
        <Orb size={360} palette="aurora" blur={60} speed={28} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,oklch(0.18_0.02_40/75%))]" />

      <div className="relative min-h-[260px] space-y-2.5 p-6 pb-2">
        {stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-[13px] text-black"
          >
            Walk me through the Sunday setup order.
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {stage === 2 && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[13px] text-white/70"
            >
              <Orb size={16} blur={2} active />
              Thinking…
            </motion.div>
          )}
          {stage >= 3 && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-fit max-w-[88%] rounded-2xl rounded-bl-md bg-white/12 px-4 py-3 text-[13px] backdrop-blur-md"
            >
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/60">
                <Sparkles className="size-3" /> Worked for 5s · Brooklyn
              </div>
              <ol className="space-y-1">
                {CHAT_STEPS.map((s, i) => (
                  <motion.li
                    key={s}
                    initial={{ opacity: 0, x: -6 }}
                    animate={
                      stage >= 3 + i
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -6 }
                    }
                    transition={{ duration: 0.4 }}
                    className="flex gap-2"
                  >
                    <span className="text-white/50 tabular-nums">{i + 1}.</span>
                    {s}
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="relative p-6 pt-4">
        <div className="text-[13px] text-white/60">Grounded answers</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">
          The setup order traced device by device along the documented signal
          chain, condensed from a real Brooklyn answer.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore                                                             */
/* ------------------------------------------------------------------ */

function ExploreSection() {
  return (
    <section id="explore" className="scroll-mt-16 pt-28 md:pt-40">
      <Container>
        <SectionHeading
          eyebrow={
            <>
              <Dot color={EXPLORE_COLOR} />
              Explore
            </>
          }
          title={
            <>
              See the whole signal chain,{" "}
              <span className="font-serif font-normal italic">
                then zoom in
              </span>
            </>
          }
          body="Every campus's wiring as an interactive diagram. Hover a device for its connections, click to focus, and export a PNG for the booth."
          action={
            <PillLink href={APP_URL} variant="light">
              Explore a campus
            </PillLink>
          }
        />
        <Reveal className="mt-12">
          <ZoomShowcase />
        </Reveal>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={Search}
            title="Search devices"
            body="Find any device by name, id or model across the campus."
          />
          <FeatureCard
            icon={MousePointerClick}
            title="Focus a device"
            body="See exactly what feeds it and where its signal goes next."
            delay={0.06}
          />
          <FeatureCard
            icon={Download}
            title="Export"
            body="Save the diagram as a PNG to print or share with the team."
            delay={0.12}
          />
        </div>
      </Container>
    </section>
  );
}

/** Scroll-driven: the overview diagram crossfades into a focused device. */
function ZoomShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: scrollContainer,
    offset: ["start end", "center center"],
  });
  const focusOpacity = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);
  const zoom = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const [focused, setFocused] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => setFocused(v > 0.75));
  return (
    <div
      ref={ref}
      className="bg-muted/80 relative overflow-hidden rounded-[28px] p-3 md:p-10"
    >
      <motion.div style={{ scale: zoom }} className="relative">
        <Shot
          src="/landing/explore.webp"
          alt="Brooklyn wiring overview in ProdBot Explore"
        />
        <motion.div
          style={{ opacity: focusOpacity }}
          className="absolute inset-0"
        >
          <Shot
            src="/landing/explore-focus.webp"
            alt="A focused device showing its inputs and outputs"
          />
        </motion.div>
      </motion.div>
      <div className="bg-card/90 border-border absolute bottom-6 left-6 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-[var(--shadow-soft)] backdrop-blur md:bottom-14 md:left-14">
        <span
          className={cn(
            "size-1.5 rounded-full transition-colors duration-500",
            focused ? EXPLORE_COLOR : "bg-muted-foreground/50",
          )}
        />
        {focused ? "Focused on Stage rack sound" : "Whole campus · 40 devices"}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const ADMIN_STEPS = [
  {
    icon: MessageSquare,
    title: "Describe it",
    body: "Tell ProdBot what plugs into what, or paste notes from the booth.",
  },
  {
    icon: Network,
    title: "AI drafts it",
    body: "It draws the wiring and writes pitfalls symptom-first, as a draft.",
  },
  {
    icon: FileCheck2,
    title: "You approve it",
    body: "Nothing reaches volunteers until an admin approves the draft.",
  },
];

function AdminSection() {
  return (
    <section id="admin" className="scroll-mt-16 pt-28 md:pt-40">
      <Container>
        <SectionHeading
          eyebrow={
            <>
              <Dot color={ADMIN_COLOR} />
              Admin
            </>
          }
          title={
            <>
              Documentation that stays a{" "}
              <span className="font-serif font-normal italic">draft</span> until
              it's right
            </>
          }
          body="Production leads keep each campus current: wiring, common pitfalls, documentation links and terminology, with every revision kept."
        />
        <div className="mt-12 grid gap-3 md:grid-cols-[1fr_1.6fr]">
          <div className="flex flex-col gap-3">
            {ADMIN_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="bg-muted/70 flex gap-4 rounded-2xl p-5">
                  <span className="bg-card inline-flex size-9 shrink-0 items-center justify-center rounded-xl shadow-[var(--shadow-soft)]">
                    <s.icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-muted-foreground text-[11px] tabular-nums">
                      0{i + 1}
                    </div>
                    <div className="text-sm font-medium">{s.title}</div>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {s.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.24}>
              <div className="bg-muted/70 flex items-center gap-3 rounded-2xl p-5">
                <History className="size-4 shrink-0" />
                <span className="text-sm">
                  Every revision kept, and stale drafts flagged.
                </span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="h-full">
            <div className="bg-muted/80 group relative h-full min-h-[360px] overflow-hidden rounded-[22px]">
              <div className="pointer-events-none absolute -right-24 -bottom-32 opacity-70 blur-3xl">
                <Orb size={380} palette="lagoon" blur={50} speed={26} />
              </div>
              <div className="absolute top-8 left-8 w-[135%] transition-transform duration-700 group-hover:-translate-x-8">
                <Shot
                  src="/landing/admin.webp"
                  alt="ProdBot Admin: add or update the Brooklyn wiring diagram"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Light / dark                                                        */
/* ------------------------------------------------------------------ */

function ThemeSection() {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  function update(clientX: number) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }
  return (
    <section className="pt-28 md:pt-40">
      <Container>
        <SectionHeading
          eyebrow="Light and dark"
          title={
            <>
              Easy on the eyes in a{" "}
              <span className="font-serif font-normal italic">dark booth</span>
            </>
          }
          body="Drag across to compare. ProdBot remembers the theme on each device, so the booth laptop can stay dark while the office stays light."
        />
        <Reveal className="mt-12">
          <div className="bg-muted/80 rounded-[28px] p-3 md:p-10">
            <div
              ref={ref}
              role="slider"
              aria-label="Compare light and dark themes"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
              tabIndex={0}
              className="relative cursor-ew-resize touch-none select-none"
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
                if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
              }}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                update(e.clientX);
              }}
              onPointerMove={(e) => dragging.current && update(e.clientX)}
              onPointerUp={() => (dragging.current = false)}
            >
              <Shot src="/landing/ask.webp" alt="ProdBot in light mode" />
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
              >
                <Shot src="/landing/ask-dark.webp" alt="ProdBot in dark mode" />
              </div>
              <div
                className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_oklch(0_0_0/10%)]"
                style={{ left: `${pos}%` }}
              >
                <span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
                  <ChevronLeft className="-mr-1 size-4" />
                  <ChevronRight className="-ml-1 size-4" />
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing                                                             */
/* ------------------------------------------------------------------ */

function ClosingCta() {
  return (
    <section className="pt-28 pb-24 md:pt-40">
      <Container>
        <div className="relative overflow-hidden rounded-[32px] bg-[oklch(0.2_0.01_60)] px-6 py-20 text-center text-white md:py-28">
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[70px]">
            <Orb size={620} palette="ember" blur={90} speed={20} />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent,oklch(0.2_0.01_60/85%))]" />
          <div className="relative">
            <Reveal>
              <h2 className="mx-auto max-w-2xl text-[38px] leading-[1.05] font-medium tracking-[-0.04em] md:text-[56px]">
                Which campus are{" "}
                <span className="font-serif font-normal italic">you</span> at?
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {CAMPUSES.map((c) => (
                  <a
                    key={c.name}
                    href={APP_URL}
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 py-1.5 pr-4 pl-1.5 text-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <Orb size={24} palette={c.palette} blur={3} />
                    {c.name}
                  </a>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <a
                href={APP_URL}
                className="group mt-10 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-black transition-shadow hover:shadow-[0_10px_40px_-8px_oklch(1_0_0/50%)]"
              >
                Open ProdBot
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center">
        <div className="text-foreground flex items-center gap-2">
          <Orb size={18} blur={3} />
          <span className="font-medium">ProdBot</span>
        </div>
        <span>The production assistant for V1 Church volunteers.</span>
        <div className="flex-1" />
        <div className="flex gap-5">
          <a
            href={APP_URL}
            className="hover:text-foreground flex items-center gap-1.5"
          >
            <MapPin className="size-3.5" /> Pick a campus
          </a>
          <a
            href="#ask"
            className="hover:text-foreground flex items-center gap-1.5"
          >
            <BookOpen className="size-3.5" /> Features
          </a>
        </div>
      </Container>
    </footer>
  );
}
