import { redirect } from "next/navigation";

export default function RequestMoneyPage() {
  redirect("/dashboard/receive");
}
