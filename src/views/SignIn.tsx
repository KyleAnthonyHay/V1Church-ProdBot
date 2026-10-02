import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BrandMark } from "@/components/Marks";
import { CanvasIllustration } from "@/landing/Canvases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@convex/demoData";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

type Flow = "signIn" | "signUp";

function friendly(e: unknown, flow: Flow) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/InvalidSecret|InvalidAccountId|Invalid credentials/i.test(msg))
    return "That email and password don't match.";
  if (/already exists/i.test(msg))
    return "An account with that email already exists. Sign in instead.";
  if (/password/i.test(msg) && flow === "signUp")
    return "Use a password of at least 8 characters.";
  return "Couldn't sign in. Check your details and try again.";
}

export function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState("");

  async function run(
    params: { email: string; password: string; flow: Flow },
    which: "form" | "demo",
  ) {
    setBusy(which);
    setError("");
    try {
      await signIn("password", params);
    } catch (e) {
      setError(friendly(e, params.flow));
      setBusy(null);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void run({ email: email.trim(), password, flow }, "form");
  }
  function demo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setFlow("signIn");
    void run(
      { email: DEMO_EMAIL, password: DEMO_PASSWORD, flow: "signIn" },
      "demo",
    );
  }

  // /app?demo signs straight into the demo church.
  const autoDemo = useRef(false);
  useEffect(() => {
    if (autoDemo.current) return;
    if (new URLSearchParams(window.location.search).has("demo")) {
      autoDemo.current = true;
      window.history.replaceState(null, "", "/app");
      demo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background flex h-full overflow-y-auto">
      <div className="flex w-full flex-col px-5 py-5 md:w-1/2 md:px-10">
        <a href="/" className="flex w-fit items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-[15px] font-semibold tracking-tight">
            ProdBot
          </span>
        </a>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-medium tracking-[-0.035em]">
            {flow === "signIn" ? (
              <>
                Welcome{" "}
                <span className="font-serif text-[1.12em] font-normal tracking-normal italic">
                  back
                </span>
              </>
            ) : (
              <>
                Set up your{" "}
                <span className="font-serif text-[1.12em] font-normal tracking-normal italic">
                  church
                </span>
              </>
            )}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {flow === "signIn"
              ? "Sign in to your production team's ProdBot."
              : "Create an account, then add your church and campuses."}
          </p>

          <button
            type="button"
            onClick={demo}
            disabled={busy !== null}
            className="group bg-card border-border hover:border-ring/50 mt-8 flex w-full items-center gap-3 rounded-2xl border p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-px disabled:opacity-60"
          >
            <span className="bg-muted inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              {busy === "demo" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Try the demo</span>
              <span className="text-muted-foreground block truncate text-xs">
                A sample church with wiring, pitfalls and chats filled in
              </span>
            </span>
            <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or with email
            <span className="bg-border h-px flex-1" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  flow === "signIn" ? "current-password" : "new-password"
                }
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy !== null}
              className="h-10 w-full rounded-full"
            >
              {busy === "form" && <Loader2 className="size-4 animate-spin" />}
              {flow === "signIn" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            {flow === "signIn" ? "New to ProdBot?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-foreground font-medium underline-offset-4 hover:underline"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError("");
              }}
            >
              {flow === "signIn" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="text-muted-foreground mt-8 text-center text-xs">
            Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </p>
        </div>
      </div>

      <div className="hidden p-3 md:block md:w-1/2">
        <div className="bg-card border-border relative flex h-full flex-col overflow-hidden rounded-[24px] border bg-[radial-gradient(circle,color-mix(in_oklch,var(--foreground)_14%,transparent)_1px,transparent_1.3px)] [background-size:22px_22px]">
          <div className="flex flex-1 items-center justify-center p-10">
            <CanvasIllustration
              id="wiring"
              className="text-foreground w-full max-w-[560px]"
            />
          </div>
          <div className="p-8 pt-0">
            <p className="max-w-sm text-[15px] leading-snug font-medium">
              Every cable, every campus, and an answer when something goes quiet
              on Sunday.
            </p>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Ask, Explore and Admin for your production team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
