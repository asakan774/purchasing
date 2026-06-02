import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionCookieValue,
  getAuthCookieOptions,
  hasLoginConfig
} from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const nextPath = sanitizeNextPath(String(form.get("next") ?? "/"));

    if (!username || !password) {
      return redirectToLogin(request, "password", nextPath);
    }

    if (!hasLoginConfig()) {
      return redirectToLogin(request, "config", nextPath);
    }

    const supabase = createServiceClient();
    const { data: user, error } = await supabase
      .from("app_users")
      .select("id,username,password_hash,password_salt,password_iterations,is_active")
      .eq("username", username)
      .maybeSingle();

    const passwordOk =
      user?.is_active &&
      (await verifyPassword({
        password,
        salt: user.password_salt,
        hash: user.password_hash,
        iterations: user.password_iterations
      }));

    if (error || !passwordOk) {
      return redirectToLogin(request, "password", nextPath);
    }

    await supabase.from("app_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

    const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
    response.cookies.set(AUTH_COOKIE_NAME, await createSessionCookieValue(user.id), getAuthCookieOptions());
    return response;
  } catch {
    return redirectToLogin(request, "server", "/");
  }
}

function redirectToLogin(request: Request, error: string, nextPath: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url, 303);
}

function sanitizeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
