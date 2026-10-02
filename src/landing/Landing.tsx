import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useTransform,
} from "motion/react";
import { BrandMark } from "@/components/Marks";
import { CanvasIllustration } from "./Canvases";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Download,
  FileCheck2,
  History,
  ListChecks,
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
        <Systems />
        <AskSection />
        <ExploreSection />
        <AdminSection />
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
          ? "bg-primary text-primary-foreground hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--brand),transparent_45%)]"
          : "bg-card border-border hover:border-ring/50 border",
        className,
      )}
    >
      {children}
    </a>
  );
}

function SectionHeading({
  title,
  body,
  action,
}: {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-end">
      <Reveal>
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
          <BrandMark size={24} />
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
          href="#preview"
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

function Hero() {
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
            <span className="text-primary font-serif font-normal tracking-[-0.01em] italic">
              answered.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: EASE }}
            className="text-muted-foreground max-w-md text-[15px] leading-relaxed md:pb-2"
          >
            ProdBot is the production assistant for church tech teams. It reads
            each campus's wiring, pitfalls and runbook, then answers volunteers
            in plain language when something goes quiet.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: EASE }}
          className="mt-7 flex flex-wrap gap-2.5"
        >
          <PillLink href={`${APP_URL}?demo`}>
            Try the demo
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </PillLink>
          <PillLink href={APP_URL} variant="light">
            Sign in
          </PillLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
          id="preview"
          className="mt-12 scroll-mt-20 md:mt-16"
        >
          <AppPreview />
        </motion.div>
      </Container>
    </section>
  );
}

/** Chapters of public/landing/preview.mp4 (a recording of the demo church). */
const CHAPTERS = [
  {
    start: 0,
    title: "Ask a question",
    body: "A volunteer describes the problem; ProdBot walks the wiring.",
  },
  {
    start: 17.1,
    title: "Explore the wiring",
    body: "Focus a device to see what feeds it and its known pitfalls.",
  },
  {
    start: 25.5,
    title: "Review in Admin",
    body: "Approve a reported fix and check the AI's draft.",
  },
];

/** "Take a look at how the app works": the recorded walkthrough, chaptered. */
function AppPreview() {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(40);
  const active = CHAPTERS.reduce((a, c, i) => (time >= c.start ? i : a), 0);
  const chapterEnd = (i: number) => CHAPTERS[i + 1]?.start ?? duration;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-medium tracking-[-0.03em] md:text-[26px]">
          Take a look at how the app works
        </h2>
        <span className="text-muted-foreground text-[13px]">
          Recorded in the demo church
        </span>
      </div>

      <div className="bg-brand-soft relative overflow-hidden rounded-[28px] p-2 md:p-4">
        <div className="border-border bg-card relative overflow-hidden rounded-[18px] border shadow-[0_1px_2px_oklch(0.2_0.01_210/6%),0_30px_60px_-30px_oklch(0.2_0.03_210/35%)]">
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
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-6">
        {CHAPTERS.map((c, i) => {
          const on = i === active;
          const progress = on
            ? Math.min(1, (time - c.start) / (chapterEnd(i) - c.start))
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
              <span className="bg-border relative block h-[2px] w-full overflow-hidden rounded-full">
                <span
                  className="bg-primary absolute inset-y-0 left-0 block"
                  style={{ width: `${progress * 100}%` }}
                />
              </span>
              <span className="mt-3 flex items-baseline gap-3">
                <span className="text-muted-foreground text-xs tabular-nums">
                  0{i + 1}
                </span>
                <span
                  className={cn(
                    "text-[15px] font-medium transition-colors",
                    on
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {c.title}
                </span>
              </span>
              <span className="text-muted-foreground mt-1 block pl-7 text-sm leading-relaxed">
                {c.body}
              </span>
            </button>
          );
        })}
      </div>
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
/* Ask                                                                 */
/* ------------------------------------------------------------------ */

// From the demo church's Downtown runbook.
const CHAT_STEPS = [
  "Power on the rack, switch, then the SoundGrid server",
  "Start the LV1 and load the Sunday show file",
  "Open Ableton and play the click",
  "Line check drums, bass and keys",
  "Fresh batteries in every vocal pack",
];

function AskSection() {
  return (
    <section id="ask" className="scroll-mt-16 pt-28 md:pt-40">
      <Container>
        <SectionHeading
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
                    alt="ProdBot's Ask screen for the Downtown campus"
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
      className="relative flex h-full min-h-[440px] flex-col justify-end overflow-hidden rounded-[22px] bg-brand-deep bg-[radial-gradient(circle,oklch(1_0_0/9%)_1px,transparent_1.2px)] [background-size:22px_22px] text-white"
    >
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
              <BrandMark size={18} active className="bg-white text-black" />
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
                <Sparkles className="size-3" /> Worked for 6s · Downtown
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
          The Sunday setup order straight from the campus runbook, with the
          pitfall to open if a step goes wrong.
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
  return (
    <div
      ref={ref}
      className="bg-muted/80 relative overflow-hidden rounded-[28px] p-3 md:p-10"
    >
      <motion.div style={{ scale: zoom }} className="relative">
        <Shot
          src="/landing/explore.webp"
          alt="Downtown wiring overview in ProdBot Explore"
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
          title={
            <>
              Documentation that stays a{" "}
              <span className="font-serif font-normal italic">draft</span> until
              it's right
            </>
          }
          body="Production leads keep each campus current: wiring, common pitfalls, documentation links and terminology, with every revision kept."
        />
        <Reveal className="mt-12">
          <div className="bg-brand-soft overflow-hidden rounded-[28px] p-2 md:p-4">
            <Shot
              src="/landing/admin.webp"
              alt="ProdBot Admin overview: stats, items waiting for review, recent pitfalls"
              className="rounded-[18px]"
            />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="mt-3">
          <div className="border-border bg-card grid overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-4">
            {[
              ...ADMIN_STEPS,
              {
                icon: History,
                title: "Nothing is lost",
                body: "Every revision is kept, and stale drafts are flagged.",
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className={cn(
                  "border-border p-5",
                  i > 0 && "border-t sm:border-t-0",
                  i % 2 === 1 && "sm:border-l",
                  i >= 2 && "sm:border-t lg:border-t-0",
                  i > 0 && "lg:border-l",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs tabular-nums">
                    0{i + 1}
                  </span>
                  <s.icon className="text-primary size-4" />
                </div>
                <div className="mt-6 text-[15px] font-medium">{s.title}</div>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
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
        <div className="relative overflow-hidden rounded-[32px] bg-brand-deep px-6 py-20 text-center text-white md:py-28">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-white/[0.07]">
            <CanvasIllustration
              id="wiring"
              mini
              className="w-[min(900px,140%)] max-w-none"
            />
          </div>
          <div className="relative">
            <Reveal>
              <h2 className="mx-auto max-w-2xl text-[38px] leading-[1.05] font-medium tracking-[-0.04em] md:text-[56px]">
                Ready before{" "}
                <span className="font-serif font-normal italic">Sunday</span>{" "}
                starts
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
                Document the wiring once, keep the fixes current, and give every
                volunteer someone to ask.
              </p>
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
          <BrandMark size={18} />
          <span className="font-medium">ProdBot</span>
        </div>
        <span>The production assistant for church tech teams.</span>
        <div className="flex-1" />
        <div className="flex gap-5">
          <a
            href={APP_URL}
            className="hover:text-foreground flex items-center gap-1.5"
          >
            <ArrowRight className="size-3.5" /> Open ProdBot
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
