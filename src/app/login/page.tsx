import { LockKeyhole } from "lucide-react";

export const runtime = "edge";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="login-mark">
          <LockKeyhole size={22} />
        </div>
        <h1>Mango Procurement</h1>
        <p>Sign in to access procurement search and imports.</p>
        {error ? <div className="login-error">{errorMessage(error)}</div> : null}
        <form className="login-form" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Username
            <input name="username" type="text" autoComplete="username" autoFocus required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Login</button>
        </form>
      </section>
    </div>
  );
}

function errorMessage(error: string) {
  if (error === "config") return "Login is not configured. Set Supabase env and AUTH_SECRET first.";
  if (error === "server") return "Login service failed. Check environment variables and app_users migration.";
  return "Password is incorrect.";
}
