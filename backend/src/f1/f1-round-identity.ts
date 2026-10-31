// Deterministic Round slug assignment for one F1 season with explicit
// collision detection. Two Rounds never share a slug silently.

import { slugify } from '../canonical/canonical-id';
import {
  F1_RACE_NAME_SLUGS,
  F1_ROUND_IDENTITY_OVERRIDES,
  F1RoundIdentityOverride,
} from './f1-identity.manifest';

export interface RoundIdentityInput {
  round: number | null;
  circuitId: string | null;
  raceName: string;
}

export interface RoundIdentityAssignment {
  slug: string;
  aliasSlugs: string[];
}

export interface RoundIdentityResult {
  assignments: RoundIdentityAssignment[];
  warnings: string[];
}

export function baseRoundSlug(raceName: string): string {
  const nameSlug = slugify(raceName);
  const mapped = F1_RACE_NAME_SLUGS[nameSlug];
  if (mapped) return mapped;
  const stripped = nameSlug.replace(/-grand-prix$/, '');
  return stripped.length > 0 ? stripped : nameSlug;
}

function findOverride(
  season: number,
  input: RoundIdentityInput,
  overrides: readonly F1RoundIdentityOverride[],
): F1RoundIdentityOverride | undefined {
  const nameSlug = slugify(input.raceName);
  return overrides.find(
    (override) =>
      override.season === season &&
      override.circuitId === input.circuitId &&
      slugify(override.raceName) === nameSlug,
  );
}

export function assignF1RoundSlugs(
  season: number,
  inputs: RoundIdentityInput[],
  overrides: readonly F1RoundIdentityOverride[] = F1_ROUND_IDENTITY_OVERRIDES,
): RoundIdentityResult {
  const warnings: string[] = [];

  const initial = inputs.map((input) => {
    const override = findOverride(season, input, overrides);
    let slug = override?.slug ?? baseRoundSlug(input.raceName);
    if (slug.length === 0) {
      slug = input.round !== null ? `round-${input.round}` : 'round';
      warnings.push(
        `identity_fallback: ${season} "${input.raceName}" has no usable name; using "${slug}"`,
      );
    }
    return { slug, aliasSlugs: override ? [...override.aliases] : [] };
  });

  const byBase = new Map<string, number[]>();
  initial.forEach((assignment, index) => {
    const members = byBase.get(assignment.slug) ?? [];
    members.push(index);
    byBase.set(assignment.slug, members);
  });

  const assignments = initial.map((assignment) => ({ ...assignment }));

  for (const [base, members] of byBase) {
    if (members.length < 2) continue;
    for (const index of members) {
      const input = inputs[index];
      const circuitPart = input.circuitId
        ? slugify(input.circuitId)
        : 'unknown';
      assignments[index].slug = `${base}-${circuitPart}`;
    }
    const resolved = members.map((index) => assignments[index].slug);
    if (new Set(resolved).size !== resolved.length) {
      for (const index of members) {
        const round = inputs[index].round;
        assignments[index].slug =
          `${assignments[index].slug}-r${round ?? index + 1}`;
      }
    }
    warnings.push(
      `identity_collision: ${season} slug "${base}" was shared by ${members.length} rounds; disambiguated as ${members
        .map((index) => `"${assignments[index].slug}"`)
        .join(', ')}. Add a reviewed override to pin these IDs.`,
    );
  }

  const canonicalSlugs = new Set(assignments.map((item) => item.slug));
  const seenAliases = new Set<string>();
  for (const assignment of assignments) {
    assignment.aliasSlugs = assignment.aliasSlugs.filter((alias) => {
      if (canonicalSlugs.has(alias) || seenAliases.has(alias)) {
        warnings.push(
          `identity_alias_conflict: ${season} alias "${alias}" ignored because it is already in use`,
        );
        return false;
      }
      seenAliases.add(alias);
      return true;
    });
  }

  return { assignments, warnings };
}
