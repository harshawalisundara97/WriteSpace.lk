import "server-only";
import type { Metadata } from "next";
import { getLocale } from "./server";
import { alternatesFor } from "./seo";

/** `alternates` for a page's metadata, using the locale being rendered. */
export async function localeAlternates(path: string): Promise<NonNullable<Metadata["alternates"]>> {
  return alternatesFor(path, await getLocale());
}
