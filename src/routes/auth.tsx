import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Baby, Users } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in to माझी चिमणी" },
      { name: "description", content: "Sign in so Mother and Father share one live baby journal across both phones." },
      { property: "og:title", content: "Sign in to माझी चिमणी" },
      { property: "og:description", content: "One shared family account for your baby's journal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Mother" | "Father">("Mother");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { name: name || "Parent", role } },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Account created", { description: "Check your email to confirm, then sign in." });
      setMode("in");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");

  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="bb-app mx-auto flex min-h-dvh w-full max-w-md flex-col bb-hero px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground bb-shadow-float"><Baby className="size-8" /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">माझी चिमणी</h1>
        <p className="mt-1 text-sm text-foreground/70">One gentle journal for mother and father.</p>
      </div>

      <div className="mt-8 rounded-2xl bg-card p-5 bb-shadow-float">
        <div className="mb-5 flex rounded-xl bg-secondary p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-11 flex-1 rounded-lg py-2 text-sm font-semibold ${
                mode === m ? "bb-gradient text-primary-foreground" : "text-secondary-foreground"
              }`}
            >
              {m === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {mode === "up" && (
          <>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 h-11 rounded-2xl"
            />
            <div className="mb-3 flex gap-2">
              {(["Mother", "Father"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold ${
                    role === r ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <Users className="size-4" /> {r}
                </button>
              ))}
            </div>
          </>
        )}

        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 h-11 rounded-2xl"
        />
        <Input
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-2xl"
        />

        <Button
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
        >
          {mode === "in" ? "Sign in" : "Create family account"}
        </Button>

        <div className="my-4 flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="secondary"
          onClick={() => void google()}
          className="h-12 w-full rounded-2xl text-sm font-semibold"
        >
          Continue with Google
        </Button>
      </div>

      <div className="mt-6 rounded-xl bg-card/70 p-4 text-center text-xs text-muted-foreground bb-shadow">
        Family account · after signing in, share your invite code from Settings so your partner joins the same baby.
      </div>

      <Link to="/" className="mt-auto pt-8 text-center text-xs font-semibold text-muted-foreground">
        Continue without signing in
      </Link>
    </div>
  );
}
