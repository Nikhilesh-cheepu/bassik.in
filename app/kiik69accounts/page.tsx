import type { Viewport } from "next";
import Kiik69AccountsClient from "./Kiik69AccountsClient";

export const metadata = {
  title: "KIIK 69 Accounts | Bassik",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#06060a",
};

export default function Kiik69AccountsPage() {
  return <Kiik69AccountsClient />;
}
