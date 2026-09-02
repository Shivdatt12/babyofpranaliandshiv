export type NameVote = "love" | "maybe" | "no";

export type NameCategory = "girl" | "boy" | "unisex";

export type NameIdea = {
  id: string;
  name: string;
  nickname?: string;
  meaning?: string;
  notes?: string;
  category?: NameCategory;
  favorite?: boolean;
  finalist?: boolean;
  /** parent attribution */
  by: string;
  byId?: string;
  addedAt: number;
  /** userId -> vote; each parent only ever writes their own key */
  votes: Record<string, NameVote>;
};

/** Duplicate guard: same name (any casing / spacing) never stored twice per family. */
export function nameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export const VOTE_LABEL: Record<NameVote, string> = {
  love: "Love it ❤️",
  maybe: "Maybe 🤔",
  no: "Not this one",
};

export type NameHarmony = {
  key: "both" | "one" | "mixed" | "none";
  label: string;
  celebrate: boolean;
};

/** Subtle compatibility indicator built from the two parents' independent votes. */
export function nameHarmony(
  idea: NameIdea,
  parents: { id: string; role: string }[],
): NameHarmony {
  const votes = parents
    .map((p) => ({ role: p.role, vote: idea.votes?.[p.id] }))
    .filter((v): v is { role: string; vote: NameVote } => !!v.vote);

  const loves = votes.filter((v) => v.vote === "love");
  if (loves.length >= 2) return { key: "both", label: "❤️ Both Love It", celebrate: true };
  if (loves.length === 1) {
    const role = loves[0]!.role;
    return {
      key: "one",
      label: role === "Father" ? "💙 Father Loves It" : role === "Mother" ? "💕 Mother Loves It" : `💕 ${role} Loves It`,
      celebrate: false,
    };
  }
  if (votes.length) return { key: "mixed", label: "🤔 Needs Discussion", celebrate: false };
  return { key: "none", label: "No votes yet", celebrate: false };
}

export type NameSort = "recent" | "az" | "votes";

export function sortNames(list: NameIdea[], sort: NameSort, parents: { id: string; role: string }[]) {
  const copy = [...list];
  if (sort === "az") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "votes")
    return copy.sort((a, b) => {
      const score = (n: NameIdea) =>
        parents.reduce((s, p) => s + (n.votes?.[p.id] === "love" ? 2 : n.votes?.[p.id] === "maybe" ? 1 : 0), 0);
      return score(b) - score(a) || b.addedAt - a.addedAt;
    });
  return copy.sort((a, b) => b.addedAt - a.addedAt);
}
