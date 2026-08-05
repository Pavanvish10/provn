// Generic, dependency-free keyword matching used across the resume
// engine: SkillExtractor uses it to find skills in resume text,
// JobDescriptionAnalyzer uses it to find required technologies, and
// CandidateKnowledgeGraph uses its diff() to compute skill gaps. Kept as
// one small utility rather than reimplemented per-extractor.

export interface KeywordDefinition {
  /** The canonical, display-ready form, e.g. "Node.js". */
  term: string;
  /** Alternate spellings/forms that should also count as a match, e.g.
   * ["NodeJS", "Node"]. */
  aliases?: string[];
}

export interface KeywordMatch {
  term: string;
  occurrences: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary regex for a term, tolerant of the punctuation common in
 * tech terms (Node.js, C++, CI/CD) by not requiring a boundary on the
 * trailing side when the term ends in a non-word character. */
function buildTermPattern(term: string): RegExp {
  const escaped = escapeRegExp(term.trim());
  const endsWithWordChar = /\w$/.test(term.trim());
  return new RegExp(`(?:^|\\W)${escaped}${endsWithWordChar ? "(?:\\W|$)" : ""}`, "gi");
}

export class KeywordMatcher {
  /** Finds every vocabulary entry that appears at least once in `text`,
   * matching on the canonical term or any of its aliases. */
  static findMatches(text: string, vocabulary: KeywordDefinition[]): KeywordMatch[] {
    const matches: KeywordMatch[] = [];
    for (const entry of vocabulary) {
      const variants = [entry.term, ...(entry.aliases ?? [])];
      let occurrences = 0;
      for (const variant of variants) {
        const found = text.match(buildTermPattern(variant));
        occurrences += found?.length ?? 0;
      }
      if (occurrences > 0) matches.push({ term: entry.term, occurrences });
    }
    return matches;
  }

  /** Case-insensitive set difference: items in `need` that aren't present
   * (as an exact, case-insensitive match) in `have`. Used to compute
   * missing skills (JD requirements not found on the resume). */
  static diff(have: string[], need: string[]): string[] {
    const haveSet = new Set(have.map((item) => item.trim().toLowerCase()));
    const seen = new Set<string>();
    return need.filter((item) => {
      const key = item.trim().toLowerCase();
      if (haveSet.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Case-insensitive set intersection, preserving `a`'s casing. */
  static intersect(a: string[], b: string[]): string[] {
    const bSet = new Set(b.map((item) => item.trim().toLowerCase()));
    const seen = new Set<string>();
    return a.filter((item) => {
      const key = item.trim().toLowerCase();
      if (!bSet.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
