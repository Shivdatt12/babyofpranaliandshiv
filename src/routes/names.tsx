import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Heart, Pencil, Trash2, Trophy, Search, Plus, Sparkles } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBabyBond } from "@/lib/babybond-store";
import { formatFullDate } from "@/lib/babybond-data";
import {
  nameHarmony,
  nameKey,
  sortNames,
  VOTE_LABEL,
  type NameCategory,
  type NameIdea,
  type NameSort,
  type NameVote,
} from "@/lib/babybond-names";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/names")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "चिमणीसाठी नाव — Baby name journey" },
      {
        name: "description",
        content:
          "Collect baby name ideas together, shortlist favourites, vote as Mum and Dad and choose her official name.",
      },
      { property: "og:title", content: "चिमणीसाठी नाव — Baby name journey" },
      { property: "og:description", content: "Name ideas, favourites, finalists and the final name — shared live between both parents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NamesPage,
});

const CATEGORIES: { key: NameCategory; label: string }[] = [
  { key: "girl", label: "Girl" },
  { key: "boy", label: "Boy" },
  { key: "unisex", label: "Unisex" },
];

const TABS = [
  { key: "all", label: "💗 All Names" },
  { key: "fav", label: "❤️ Favorites" },
  { key: "final", label: "🏆 Finalists" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Draft = {
  name: string;
  nickname: string;
  meaning: string;
  notes: string;
  category: NameCategory | "";
};

const emptyDraft: Draft = { name: "", nickname: "", meaning: "", notes: "", category: "" };

function JourneyBar({ counts }: { counts: { ideas: number; fav: number; finalists: number; chosen: boolean } }) {
  const steps = [
    { emoji: "🌱", label: "Ideas", value: counts.ideas, done: counts.ideas > 0 },
    { emoji: "💗", label: "Favorites", value: counts.fav, done: counts.fav > 0 },
    { emoji: "✨", label: "Finalists", value: counts.finalists, done: counts.finalists > 0 },
    { emoji: "👶", label: "Her Name", value: counts.chosen ? 1 : 0, done: counts.chosen },
  ];
  return (
    <div className="flex items-stretch gap-1.5">
      {steps.map((s) => (
        <div
          key={s.label}
          className={cn(
            "flex-1 rounded-2xl px-2 py-2 text-center transition-colors",
            s.done ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          <div className="text-base leading-none">{s.emoji}</div>
          <div className="mt-1 text-[10px] font-bold leading-tight">{s.label}</div>
          <div className="text-[10px] opacity-80 tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function VoteRow({ idea }: { idea: NameIdea }) {
  const { parents, me, voteNameIdea } = useBabyBond();
  const harmony = nameHarmony(idea, parents);
  const mine = idea.votes?.[me.id];
  const others = parents.filter((p) => p.id !== me.id && idea.votes?.[p.id]);

  return (
    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(VOTE_LABEL) as NameVote[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => voteNameIdea(idea.id, mine === v ? null : v)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold transition-transform active:scale-95",
              mine === v ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {VOTE_LABEL[v]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-card px-2 py-0.5 font-semibold">{harmony.label}</span>
        {others.map((p) => (
          <span key={p.id}>
            {p.role === "Father" ? "💙" : "❤️"} {p.role}: {VOTE_LABEL[idea.votes[p.id] as NameVote]}
          </span>
        ))}
      </div>
      {harmony.celebrate ? (
        <p className="rounded-2xl bg-health px-3 py-2 text-[11px] font-semibold text-health-foreground">
          Looks like Mum &amp; Dad both love this one! ❤️
        </p>
      ) : null}
    </div>
  );
}

function NameCard({ idea, onEdit }: { idea: NameIdea; onEdit: (i: NameIdea) => void }) {
  const { updateNameIdea, deleteNameIdea } = useBabyBond();
  return (
    <SoftCard
      className={cn(
        idea.finalist && "border border-primary/40 bg-card/95 bb-shadow-float",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">
            {idea.finalist ? "✨ " : ""}
            {idea.name}
          </p>
          {idea.meaning ? <p className="text-xs text-muted-foreground">{idea.meaning}</p> : null}
          {idea.nickname ? <p className="text-xs text-muted-foreground">Nickname · {idea.nickname}</p> : null}
          {idea.notes ? <p className="mt-1 text-xs opacity-80">{idea.notes}</p> : null}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Added by {idea.by} · {formatFullDate(idea.addedAt)}
            {idea.category ? ` · ${idea.category}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label={idea.favorite ? "Remove favourite" : "Mark favourite"}
            onClick={() => updateNameIdea(idea.id, { favorite: !idea.favorite })}
            className={cn(
              "grid size-9 place-items-center rounded-full transition-transform active:scale-90",
              idea.favorite ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            <Heart className={cn("size-4", idea.favorite && "fill-current")} />
          </button>
          <button
            type="button"
            aria-label="Edit name"
            onClick={() => onEdit(idea)}
            className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground active:scale-90"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Delete name"
            onClick={() => {
              deleteNameIdea(idea.id);
              toast.success(`${idea.name} removed`);
            }}
            className="grid size-9 place-items-center rounded-full bg-secondary text-destructive active:scale-90"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {idea.favorite ? (
        <button
          type="button"
          onClick={() => {
            updateNameIdea(idea.id, { finalist: !idea.finalist });
            toast.success(idea.finalist ? `${idea.name} moved back to favourites` : `${idea.name} is a finalist 🏆`);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-2 text-[11px] font-bold text-secondary-foreground active:scale-95"
        >
          <Trophy className="size-3.5" />
          {idea.finalist ? "Remove from finalists" : "Move to finalists"}
        </button>
      ) : null}

      {idea.finalist ? <VoteRow idea={idea} /> : null}
    </SoftCard>
  );
}

function NamesPage() {
  const { nameIdeas, baby, parents, addNameIdea, updateNameIdea, chooseFinalName, clearFinalName } = useBabyBond();
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<NameSort>("recent");
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<NameIdea | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const finalists = nameIdeas.filter((n) => n.finalist);
  const favorites = nameIdeas.filter((n) => n.favorite);
  const chosen = baby.nameStatus === "final" ? nameIdeas.find((n) => n.id === baby.chosenNameId) : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = tab === "fav" ? favorites : tab === "final" ? finalists : nameIdeas;
    const filtered = q
      ? base.filter((n) =>
          [n.name, n.nickname, n.meaning, n.notes].some((v) => (v ?? "").toLowerCase().includes(q)),
        )
      : base;
    return sortNames(filtered, sort, parents);
  }, [tab, query, sort, nameIdeas, favorites, finalists, parents]);

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setSheet(true);
  };

  const openEdit = (idea: NameIdea) => {
    setEditing(idea);
    setDraft({
      name: idea.name,
      nickname: idea.nickname ?? "",
      meaning: idea.meaning ?? "",
      notes: idea.notes ?? "",
      category: idea.category ?? "",
    });
    setSheet(true);
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Please enter a name");
      return;
    }
    const dupe = nameIdeas.find((n) => nameKey(n.name) === nameKey(name) && n.id !== editing?.id);
    if (dupe) {
      toast.info(`${dupe.name} is already on your list 💕`);
      setSheet(false);
      return;
    }
    const payload = {
      name,
      ...(draft.nickname.trim() ? { nickname: draft.nickname.trim() } : {}),
      ...(draft.meaning.trim() ? { meaning: draft.meaning.trim() } : {}),
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      ...(draft.category ? { category: draft.category } : {}),
    };
    if (editing) {
      updateNameIdea(editing.id, payload);
      toast.success("Name updated");
    } else {
      addNameIdea(payload);
      toast.success(`${name} added to the list ✨`);
    }
    setSheet(false);
  };

  const confirmName = finalists.find((n) => n.id === confirmId);

  return (
    <AppShell>
      <PageHeader title="चिमणीसाठी नाव 💕" subtitle="आपल्या छोट्या चिमणीसाठी perfect नाव शोधूया" />

      <div className="space-y-4 px-5 pb-6">
        <JourneyBar
          counts={{ ideas: nameIdeas.length, fav: favorites.length, finalists: finalists.length, chosen: !!chosen }}
        />

        {chosen ? (
          <SoftCard tone="milk" className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">✨ Her Name</p>
            <p className="font-display text-3xl font-bold">{chosen.name}</p>
            {chosen.meaning ? <p className="text-xs opacity-80">{chosen.meaning}</p> : null}
            <p className="mt-1 text-xs opacity-80">Officially chosen by Mum &amp; Dad ❤️</p>
            {baby.chosenAt ? (
              <p className="text-[11px] opacity-60">{formatFullDate(baby.chosenAt)} · confirmed by {baby.chosenBy}</p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                clearFinalName();
                toast.success("Back to choosing 💗", { description: "Her profile name stays as it is." });
              }}
              className="mt-3 rounded-2xl bg-card px-4 py-2 text-[11px] font-bold active:scale-95"
            >
              Change Baby Name
            </button>
          </SoftCard>
        ) : null}

        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-2xl py-2 text-[11px] font-bold transition-colors",
                tab === t.key ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names"
              className="h-10 rounded-2xl pl-9"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NameSort)}
            className="h-10 rounded-2xl border border-border bg-card px-3 text-xs font-semibold"
            aria-label="Sort names"
          >
            <option value="recent">Newest</option>
            <option value="az">A–Z</option>
            <option value="votes">Most loved</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bb-gradient py-3 text-sm font-bold text-primary-foreground active:scale-95"
        >
          <Plus className="size-4" /> Add a name idea
        </button>

        {tab === "final" && finalists.length && !chosen ? (
          <SoftCard tone="health" className="space-y-2">
            <p className="text-sm font-bold">Choose Her Name ✨</p>
            <p className="text-[11px] opacity-80">Pick one finalist — you'll be asked to confirm.</p>
            <div className="flex flex-wrap gap-2">
              {finalists.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setConfirmId(n.id)}
                  className="rounded-2xl bg-card px-3 py-2 text-xs font-bold active:scale-95"
                >
                  {n.name}
                </button>
              ))}
            </div>
          </SoftCard>
        ) : null}

        {visible.length ? (
          <div className="space-y-3">
            {visible.map((idea) => (
              <NameCard key={idea.id} idea={idea} onEdit={openEdit} />
            ))}
          </div>
        ) : (
          <SoftCard className="py-8 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-bold">
              {tab === "all" ? "No names yet" : tab === "fav" ? "No favourites yet" : "No finalists yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {tab === "all"
                ? "Add the first idea — your partner will see it instantly."
                : "Heart a name to shortlist it, then move it here."}
            </p>
          </SoftCard>
        )}
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit name" : "Add a name"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pb-6">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Name"
              className="h-11 rounded-2xl"
            />
            <Input
              value={draft.nickname}
              onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
              placeholder="Nickname (optional)"
              className="h-11 rounded-2xl"
            />
            <Input
              value={draft.meaning}
              onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
              placeholder="Meaning (optional)"
              className="h-11 rounded-2xl"
            />
            <Textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Notes (optional)"
              className="rounded-2xl"
            />
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setDraft({ ...draft, category: draft.category === c.key ? "" : c.key })}
                  className={cn(
                    "flex-1 rounded-2xl py-2 text-xs font-semibold",
                    draft.category === c.key
                      ? "bb-gradient text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={save}
              className="w-full rounded-3xl bb-gradient py-3 text-sm font-bold text-primary-foreground active:scale-95"
            >
              {editing ? "Save changes" : "Add name"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Make this her official name?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmName ? `${confirmName.name} will become her name across the app.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={() => {
                if (confirmId) {
                  chooseFinalName(confirmId);
                  toast.success("Her name is chosen ❤️");
                }
                setConfirmId(null);
              }}
            >
              Yes, this is her name ❤️
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
