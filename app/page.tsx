import { redirect } from "next/navigation"

export default function Page() {
  // Redirect to landing page (web app not available in production)
  redirect('/landing')
}