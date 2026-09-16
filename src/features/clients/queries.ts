// Read functions for the clients domain, called by an async Server Component
// (`ai-rules/policy_architecture.md` -> Structure, AD-006). Thin wrappers over
// `repository.ts`: no Prisma import here (AD-004) - each function's return
// type is derived from the repository call it forwards to, rather than a
// `Client` type imported directly.

import * as repository from "./repository";

/**
 * Every client, ordered by name, with its referring partner's `id`/`name`
 * joined in - the `/clients` list's full dataset.
 */
export function listClients(): ReturnType<typeof repository.listClients> {
  return repository.listClients();
}

/**
 * One client by id, with its referring partner's `id`/`name` joined in, or
 * `null` when it does not exist.
 */
export function getClientById(
  id: number,
): ReturnType<typeof repository.getClientById> {
  return repository.getClientById(id);
}
