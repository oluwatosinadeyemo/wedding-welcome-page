import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Photo {
  id: string;
  file_path: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
}

const getPublicUrl = (filePath: string) =>
  supabase.storage.from("wedding-photos").getPublicUrl(filePath).data.publicUrl;

const SlideshowPage = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());

  // Prevent screen from sleeping while slideshow is open
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        // Wake Lock not supported or denied — user must manage power settings manually
      }
    };

    acquire();

    // Re-acquire if tab becomes visible again (e.g. after alt-tab)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);


    const { data, error } = await supabase
      .from("wedding_photos")
      .select("id, file_path, uploaded_by, caption, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Slideshow fetch error:", error);
      setIsLoading(false);
      return;
    }

    const incoming = (data as Photo[]) || [];

    // Detect photos we haven't seen before
    const fresh = incoming
      .filter((p) => !knownIds.current.has(p.id))
      .map((p) => p.id);

    incoming.forEach((p) => knownIds.current.add(p.id));

    if (fresh.length > 0 && knownIds.current.size > fresh.length) {
      // Only highlight as "new" if we already had photos (not on initial load)
      setNewIds(new Set(fresh));
      setTimeout(() => setNewIds(new Set()), 5000);
    }

    setPhotos(incoming);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPhotos();

    const channel = supabase
      .channel("slideshow-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wedding_photos" },
        () => fetchPhotos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPhotos]);

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0a0a0a" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(10,10,10,0.95)" }}
      >
        <span className="font-serif text-xl tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>
          T &amp; P
        </span>
        <span
          className="text-sm font-sans tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          #T&amp;P2026
        </span>
        <span
          className="font-sans text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          December 12, 2026
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ minHeight: "80vh" }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      ) : photos.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 text-center px-8"
          style={{ minHeight: "80vh" }}
        >
          <p className="font-serif text-4xl" style={{ color: "rgba(255,255,255,0.15)" }}>
            Waiting for photos…
          </p>
          <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.15)" }}>
            Guests will share their memories here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3 pb-12">
          {photos.map((photo) => {
            const isNew = newIds.has(photo.id);
            return (
              <div
                key={photo.id}
                className="relative overflow-hidden rounded-lg group"
                style={{
                  aspectRatio: "1 / 1",
                  boxShadow: isNew
                    ? "0 0 0 2px rgba(255,255,255,0.7), 0 0 30px rgba(255,255,255,0.2)"
                    : "none",
                  transition: "box-shadow 0.7s ease",
                }}
              >
                <img
                  src={getPublicUrl(photo.file_path)}
                  alt={photo.caption || "Wedding photo"}
                  className="w-full h-full object-cover"
                  style={{
                    transform: isNew ? "scale(1.03)" : "scale(1)",
                    transition: "transform 0.7s ease",
                  }}
                />

                {/* Uploader overlay on hover */}
                <div
                  className="absolute inset-0 flex flex-col justify-end px-2 py-2 opacity-0 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <p className="text-white text-xs font-sans truncate">
                    {photo.uploaded_by || "Guest"}
                  </p>
                  {photo.caption && (
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {photo.caption}
                    </p>
                  )}
                </div>

                {/* NEW badge */}
                {isNew && (
                  <div
                    className="absolute top-2 left-2 text-black text-xs font-sans font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "white", animation: "pulse 1s infinite" }}
                  >
                    NEW
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer memory count */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-center py-3 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)" }}
      >
        <p
          className="text-xs font-sans tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          {photos.length} {photos.length === 1 ? "memory" : "memories"} shared
        </p>
      </div>
    </div>
  );
};

export default SlideshowPage;
