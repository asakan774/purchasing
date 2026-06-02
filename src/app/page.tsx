import { ImportUploader } from "@/components/ImportUploader";
import { canConnectSupabase } from "@/lib/search/queries";

export default function HomePage() {
  return (
    <div className="page-stack">
      {!canConnectSupabase() ? (
        <div className="setup-warning">
          Supabase environment variables are not configured yet. Add `.env.local` from `.env.example` before using import.
        </div>
      ) : null}
      <ImportUploader />
    </div>
  );
}
