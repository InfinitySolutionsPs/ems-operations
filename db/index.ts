import { env } from "@/lib/server-env";

export function getDb() {
  return env.DB;
}
