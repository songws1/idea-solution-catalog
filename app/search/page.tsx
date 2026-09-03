import { redirect } from "next/navigation";

// The catalog landing page (Addendum A §1) replaced the standalone /search
// view; old links keep working via this redirect.
export default function SearchPage() {
  redirect("/");
}
