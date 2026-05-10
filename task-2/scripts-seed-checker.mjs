import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const users = [
  { id: "33333333-3333-3333-3333-333333333331", email: "ivan@demo.app", password: "Password123!", name: "Check Ivan" },
  { id: "33333333-3333-3333-3333-333333333332", email: "mila@demo.app", password: "Password123!", name: "Check Mila" },
  { id: "11111111-1111-1111-1111-111111111111", email: "host@demo.app", password: "Password123!", name: "Coastal Collective" },
  { id: "22222222-2222-2222-2222-222222222221", email: "alice@demo.app", password: "Password123!", name: "Alice Reed" },
];
for (const u of users) {
  // Try update first
  const { data: existing } = await admin.auth.admin.getUserById(u.id);
  if (existing?.user) {
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: u.password, email: u.email, email_confirm: true });
    console.log("updated", u.email, error?.message ?? "ok");
  } else {
    // Try lookup by email via listUsers
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list.users.find(x => x.email === u.email);
    if (found) {
      const { error } = await admin.auth.admin.updateUserById(found.id, { password: u.password, email_confirm: true });
      console.log("updated by email", u.email, "actual id:", found.id, error?.message ?? "ok");
    } else {
      const { data, error } = await admin.auth.admin.createUser({ id: u.id, email: u.email, password: u.password, email_confirm: true, user_metadata: { display_name: u.name } });
      console.log("created", u.email, error?.message ?? data?.user?.id);
    }
  }
}
