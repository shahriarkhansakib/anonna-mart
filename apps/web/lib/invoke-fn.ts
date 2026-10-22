import { supabase } from "@/integrations/supabase/client";

export async function invokeFn<T = any>(
  name: string,
  options: { body?: unknown } = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch(`/api/public/fn/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(options.body ?? {}),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
      return { data: data as T, error: new Error(msg) };
    }
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
