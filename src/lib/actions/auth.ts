"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Đăng xuất và quay về trang đăng nhập. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
