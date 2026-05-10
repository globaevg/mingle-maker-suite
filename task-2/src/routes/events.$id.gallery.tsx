import { createFileRoute } from "@tanstack/react-router";
import { GalleryModeration } from "@/components/GalleryModeration";

export const Route = createFileRoute("/events/$id/gallery")({
  component: GalleryRoute,
});

function GalleryRoute() {
  const { id } = Route.useParams();
  return <GalleryModeration eventId={id} />;
}