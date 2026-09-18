// Read functions for the partners domain, called by an async Server
// Component and, cross-feature, by `clients/components/` for the
// referring-partner `Select` (`ai-rules/policy_architecture.md` -> Structure,
// AD-006). Thin wrappers over `repository.ts`: no Prisma import here (AD-004)
// - each function's return type is derived from the repository call it
// forwards to, rather than a `Partner` type imported directly.

import * as repository from "./repository";

/** Every partner, ordered by name - the `/partners` list's full dataset. */
export function listPartners(): ReturnType<typeof repository.listPartners> {
  return repository.listPartners();
}

/**
 * Every active partner, ordered by name - feeds the client form's
 * referring-partner `Select` (design screen 5), which offers only active
 * partners for a fresh link.
 */
export function listActivePartners(): ReturnType<
  typeof repository.listActivePartners
> {
  return repository.listActivePartners();
}

/** One partner by id, or `null` when it does not exist. */
export function getPartnerById(
  id: number,
): ReturnType<typeof repository.getPartnerById> {
  return repository.getPartnerById(id);
}

/**
 * One partner plus its linked clients, or `null` when it does not exist -
 * the partner detail view's full dataset.
 */
export function getPartnerWithClients(
  id: number,
): ReturnType<typeof repository.getPartnerWithClients> {
  return repository.getPartnerWithClients(id);
}
