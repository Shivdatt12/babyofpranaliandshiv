import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to BabyBond" },
      { name: "description", content: "Sign in to BabyBond with your phone number and start tracking together." },
      { property: "og:title", content: "Sign in to BabyBond" },
      { property: "og:description", content: "Phone sign-in for your shared family baby journal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bb-hero px-6 pb-10 pt-16">
      <div className="text-center">
        <span className="text-5xl">🍼</span>
        <h1 className="mt-3 font-display text-3xl font-bold">BabyBond</h1>
        <p className="mt-1 text-sm text-foreground/70">
          One gentle journal for mother and father.
        </p>
      </div>

      <div className="mt-10 rounded-[2rem] bg-card p-6 bb-shadow-float">
        {step === "phone" ? (
          <>
            <h2 className="font-display text-lg font-bold">Enter your phone</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We'll send a 6-digit code to verify it's you.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-2xl bg-secondary px-3 py-2.5 text-sm font-semibold text-secondary-foreground">
                +91
              </span>
              <Input
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
            <Button
              className="mt-5 h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                setStep("otp");
                toast.success("Code sent", { description: "Demo code: 123456" });
              }}
            >
              Send OTP
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-lg font-bold">Verify your number</h2>
            <p className="mt-1 text-xs text-muted-foreground">Sent to +91 {phone || "98765 43210"}</p>
            <div className="mt-5 flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 rounded-2xl text-base" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button asChild className="mt-6 h-12 w-full rounded-2xl bb-gradient text-primary-foreground">
              <Link to="/">Verify & continue</Link>
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="mt-3 w-full text-xs font-semibold text-muted-foreground"
            >
              Change number
            </button>
          </>
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-card/70 p-4 text-center text-xs text-muted-foreground">
        Family account · invite your partner after sign-in so both phones stay in sync.
      </div>

      <Link to="/" className="mt-auto pt-8 text-center text-xs font-semibold text-muted-foreground">
        Skip for now
      </Link>
    </div>
  );
}
