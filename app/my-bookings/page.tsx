import dynamic from "next/dynamic";

const MyBookingsClient = dynamic(() => import("./MyBookingsClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  ),
});

export default function MyBookingsPage() {
  return <MyBookingsClient />;
}
