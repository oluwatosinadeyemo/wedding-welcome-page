import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());

  const fetchPhotos = useCallback(async () => {
    const { data } = await supabase
      .from("wedding_photos")
      .select("id, file_path, uploaded_by, caption, created_at")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });

    if (!data) return;

    const incoming = data as Photo[];
    const fresh = incoming
      .filter((p) => !knownIds.current.has(p.id))
      .map((p) => p.id);

    if (fresh.length > 0) {
      setNewIds((prev) => new Set([...prev, ...fresh]));
      fresh.forEach((id) => knownIds.current.add(id));
      // Remove "new" highlight after 4s
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          fresh.forEach((id) => next.delete(id));
          return next;
        });
      }, 4000);
    } else {
      incoming.forEach((p) => knownIds.current.add(p.id));
    }

    setPhotos(incoming);
  }, []);

  useEffect(() => {
    fetchPhotos();

    const channel = supabase
      .channel("slideshow-photos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wedding_photos" },
        () => fetchPhotos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPhotos]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-gradient-to-b from-[#0a0a0a] to-transparent">
        <div className="font-serif text-2xl tracking-widest text-white/80">
          T &amp; P
        </div>
        <div className="text-white/40 text-sm font-sans tracking-[0.3em] uppercase">
          #T&amp;P2026
        </div>
        <div className="font-sans text-white/40 text-sm">
          December 12, 2026
        </div>
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <p className="font-serif text-4xl text-white/20">
            Waiting for photos…
          </p>
          <p className="text-white/20 text-sm font-sans">
            Guests will share their memories here
          </p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 px-4 pb-8 pt-2">
          {photos.map((photo) => {
            const isNew = newIds.has(photo.id);
            return (
              <div
                key={photo.id}
                className={`break-inside-avoid mb-3 rounded-xl overflow-hidden relative group transition-all duration-700 ${
                  isNew
                    ? "ring-2 ring-white/60 shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-[1.01]"
                    : ""
                }`}
              >
                <img
                  src={getPublicUrl(photo.file_path)}
                  alt={photo.caption || "Wedding photo"}
                  className="w-full object-cover block"
                  loading="lazy"
                />
                {/* Caption overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm font-sans truncate">
                    {photo.uploaded_by || "Guest"}
                  </p>
                  {photo.caption && (
                    <p className="text-white/70 text-xs truncate mt-0.5">
                      {photo.caption}
                    </p>
                  )}
                </div>
                {/* NEW badge */}
                {isNew && (
                  <div className="absolute top-2 left-2 bg-white text-black text-xs font-sans font-bold px-2 py-0.5 rounded-full animate-pulse">
                    NEW
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center py-3 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none">
        <p className="text-white/20 text-xs font-sans tracking-widest uppercase">
          {photos.length} {photos.length === 1 ? "memory" : "memories"} shared
        </p>
      </div>
    </div>
  );
};

export default SlideshowPage;
