import { redirect } from "next/navigation";

/** Old links to /login go to "/", which shows the sign-in page to signed-out visitors. */
export default function LoginPage() {
  redirect("/");
}
