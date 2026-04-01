import HomeTrail from "@/components/HomeTrail";
import { getHomeFeedEvents } from "@/lib/home-events-feed";

export const revalidate = 30;

export default async function LandingPage() {
  const initialHomeEvents = await getHomeFeedEvents();
  return <HomeTrail initialHomeEvents={initialHomeEvents} />;
}
