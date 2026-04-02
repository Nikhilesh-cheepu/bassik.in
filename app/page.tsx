import HomeTrail from "@/components/HomeTrail";
import { getHomeFeedEvents } from "@/lib/home-events-feed";
import { getHomeReviewsFeed } from "@/lib/home-reviews";

export const revalidate = 30;

export default async function LandingPage() {
  const initialHomeEvents = await getHomeFeedEvents();
  const initialHomeReviews = await getHomeReviewsFeed();
  return <HomeTrail initialHomeEvents={initialHomeEvents} initialHomeReviews={initialHomeReviews} />;
}
