import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ outlet: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Meta ad alias — same as /chat with UTM preserved. */
export default async function LeadChatAliasPage({ params, searchParams }: PageProps) {
  const { outlet } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") q.set(key, value);
  }
  const qs = q.toString();
  redirect(`/${outlet}/chat${qs ? `?${qs}` : ""}`);
}
