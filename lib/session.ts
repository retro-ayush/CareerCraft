import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "./auth";

/** True when the current request carries a valid session cookie. For server components. */
export async function isSignedIn(): Promise<boolean> {
  return isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
}
