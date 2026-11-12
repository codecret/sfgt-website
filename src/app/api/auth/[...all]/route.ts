import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function authUnavailable() {
  return new Response("Not found", { status: 404 });
}

export const { GET, POST } = auth
  ? toNextJsHandler(auth.handler)
  : { GET: authUnavailable, POST: authUnavailable };
