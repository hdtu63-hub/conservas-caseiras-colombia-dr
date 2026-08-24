import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  let dbBinding = process.env.DB;
  
  try {
    const ctx = getRequestContext();
    if (ctx && ctx.env && ctx.env.DB) {
      dbBinding = ctx.env.DB;
    }
  } catch (e) {
    // getRequestContext might fail outside of edge runtime
  }

  if (!dbBinding) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }

  return drizzle(dbBinding as any, { schema });
}
