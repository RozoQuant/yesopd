// src/app/test-supabase/page.tsx

import { createClient } from "@/lib/supabase/server";

export default async function TestSupabase() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  return (
    <pre>
      {JSON.stringify(
        {
          user: data?.user ?? null,
          error: error?.message ?? null,
        },
        null,
        2
      )}
    </pre>
  );
}