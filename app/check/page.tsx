import { redirect } from "next/navigation";

// The overlap check moved to the landing page in v4.5 — it is the front door
// now, not a tab someone has to find. Links to /check keep working.
export default function CheckPage() {
  redirect("/");
}
