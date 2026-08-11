import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, Heart, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import type { Baby } from "@/lib/babybond-data";

/** Shown while the signed-in family's profile and records are still loading. */
export function LoadingScreen() {
  return (
    <div className="space-y-4 px-5 py-8">
      <div className="h-6 w-32 animate-pulse rounded-full bg-secondary" />
      <div className="h-28 animate-pulse rounded-3xl bg-secondary" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-secondary" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-3xl bg-secondary" />
    </div>
  );
}

export function SignInPrompt() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="text-5xl">🐦</span>
      <h1 className="font-display text-2xl font-bold">Welcome to माझी चिमणी ❤️</h1>
      <p className="text-sm text-muted-foreground">Sign in to open your family&apos;s baby journal.</p>
      <Link
        to="/auth"
        className="mt-2 flex items-center gap-2 rounded-2xl bb-gradient px-6 py-3 text-sm font-bold text-primary-foreground"
      >
        <LogIn className="size-4" /> Sign in
      </Link>
    </div>
  );
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** Empty-state onboarding: the family creates its own baby, no demo data anywhere. */
export function CreateBabyProfile() {
  const { createBaby } = useBabyBond();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [weight, setWeight] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(file);
  };

  const submit = async () => {
    if (!name.trim() || !date) {
      toast.error("Baby name and date of birth are required");
      return;
    }
    const bornAt = new Date(`${date}T${time || "00:00"}`).getTime();
    const baby: Baby = {
      name: name.trim(),
      bornAt,
      gender,
      bloodGroup,
      birthWeightGrams: weight ? Math.round(Number(weight) * 1000) : null,
      photo,
    };
    setBusy(true);
    try {
      await createBaby(baby);
      toast.success(`${baby.name}'s profile created 🎉`);
    } catch {
      toast.error("Could not create the profile — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 px-5 py-8">
      <div className="text-center">
        <span className="text-5xl">🐦</span>
        <h1 className="mt-2 font-display text-2xl font-bold">Welcome to माझी चिमणी ❤️</h1>
        <p className="text-sm text-muted-foreground">Create your baby&apos;s profile to get started.</p>
      </div>

      <SoftCard className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-secondary">
            {photo ? (
              <img src={photo} alt="Baby" className="size-16 object-cover" />
            ) : (
              <Heart className="size-6 text-muted-foreground" />
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground">
            <Camera className="size-4" /> Add photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
        </div>

        <Input
          placeholder="Baby name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 rounded-2xl"
        />
        <div className="flex gap-2">
          {(["girl", "boy"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`flex-1 rounded-2xl py-2 text-sm font-semibold capitalize ${
                gender === g ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBloodGroup(b)}
              className={`rounded-2xl px-3 py-1.5 text-xs font-semibold ${
                bloodGroup === b ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <Input
          type="number"
          step="0.01"
          placeholder="Birth weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-11 rounded-2xl"
        />
        <Button onClick={submit} disabled={busy} className="h-12 w-full rounded-2xl bb-gradient text-primary-foreground">
          {busy ? "Creating…" : "Create Baby Profile"}
        </Button>
      </SoftCard>
    </div>
  );
}
