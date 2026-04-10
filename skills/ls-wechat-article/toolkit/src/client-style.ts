import { existsSync, readFileSync } from 'node:fs';

import { parse as parseYaml } from 'yaml';

import { resolveRuntimeReadPath } from './runtime-paths.js';

export interface ClientStyleConfig {
  author?: string;
  theme?: string;
  [key: string]: unknown;
}

export function loadClientStyle(client?: string): ClientStyleConfig {
  if (!client || client === 'default') return {};

  const stylePath = resolveRuntimeReadPath(['clients', client, 'style.yaml']);
  if (!existsSync(stylePath)) return {};

  return (parseYaml(readFileSync(stylePath, 'utf-8')) as ClientStyleConfig | null) || {};
}

export function resolvePublishAuthor(
  cliAuthor?: string,
  configAuthor?: string,
  clientStyle: Pick<ClientStyleConfig, 'author'> = {},
): string | undefined {
  return cliAuthor || clientStyle.author || configAuthor;
}
