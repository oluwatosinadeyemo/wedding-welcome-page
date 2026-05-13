import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize, Minimize } from "lucide-react";

interface Photo {
  id: string;
  file_path: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
  isStatic?: boolean;
}

const NUM_COLS = 4;

const STATIC_PREWEDDING: Photo[] = [
  { id: "static-1", file_path: "/prewedding/DAP_8980.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-2", file_path: "/prewedding/DAP_9007.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-3", file_path: "/prewedding/DAP_9213.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-4", file_path: "/prewedding/DAP_9459.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-5", file_path: "/prewedding/DAP_9153.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-6", file_path: "/prewedding/DAP_9195.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-7", file_path: "/prewedding/DAP_9392.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
  { id: "static-8", file_path: "/prewedding/DAP_9451.jpg", uploaded_by: null, caption: null, created_at: "", isStatic: true },
];

const getPublicUrl = (filePath: string) =>
  supabase.storage.from("wedding-photos").getPublicUrl(filePath).data.publicUrl;

const getPhotoUrl = (photo: Photo) =>
  photo.isStatic ? photo.file_path : getPublicUrl(photo.file_path);

const SlideshowPage = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const scrollTimer = useRef<number | null>(null);

  // ── Fix 4: Wake Lock — keep screen on ────────────────────────────────────
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch { /* wake lock not supported */ }
    };
    acquire();
    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ── Fix 1: Fullscreen API ─────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ── Fix 3: Auto-scroll ────────────────────────────────────────────────────
  const stopScroll = useCallback(() => {
    if (scrollTimer.current) {
      clearInterval(scrollTimer.current);
      scrollTimer.current = null;
    }
  }, []);

  const startScroll = useCallback(() => {
    stopScroll();
    scrollTimer.current = window.setInterval(() => {
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 10;
      if (atBottom) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.scrollY + 1 });
      }
    }, 40); // ~25px per second
  }, [stopScroll]);

  // Start scrolling once photos arrive
  useEffect(() => {
    if (photos.length > 0) startScroll();
    return stopScroll;
  }, [photos.length > 0]); // eslint-disable-line

  // When a new photo comes in: jump to top, pause, then resume scrolling
  useEffect(() => {
    if (newIds.size === 0) return;
    stopScroll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    const t = window.setTimeout(() => startScroll(), 5000);
    return () => clearTimeout(t);
  }, [newIds]); // eslint-disable-line

  // ── Data fetching + realtime ──────────────────────────────────────────────
  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("wedding_photos")
      .select("id, file_path, uploaded_by, caption, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Slideshow fetch error:", error);
      setIsLoading(false);
      return;
    }

    const dbPhotos = (data as Photo[]) || [];
    const fresh = dbPhotos
      .filter((p) => !knownIds.current.has(p.id))
      .map((p) => p.id);
    dbPhotos.forEach((p) => knownIds.current.add(p.id));

    // Only flag as "new" after initial load
    if (fresh.length > 0 && knownIds.current.size > fresh.length) {
      setNewIds(new Set(fresh));
      setTimeout(() => setNewIds(new Set()), 5000);
    }

    // Merge static prewedding + DB guest photos, deduplicate by file_path
    const seen = new Set<string>();
    const merged = [...STATIC_PREWEDDING, ...dbPhotos].filter((p) => {
      if (seen.has(p.file_path)) return false;
      seen.add(p.file_path);
      return true;
    });
    setPhotos(merged);
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

  // ── Fix 2: Masonry columns (full photo height) ────────────────────────────
  const visiblePhotos = photos.filter((p) => !failedImages.has(p.file_path));
  const columns = Array.from({ length: NUM_COLS }, (_, i) =>
    visiblePhotos.filter((_, j) => j % NUM_COLS === i)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "white" }}>

      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: "rgba(10,10,10,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ fontFamily: "serif", fontSize: 20, letterSpacing: "0.15em", color: "rgba(255,255,255,0.7)" }}>
          T &amp; P
        </span>
        <span style={{ fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.25em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          #T&amp;P2026
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            December 12, 2026
          </span>
          {/* Fix 1: Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      ) : photos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 12, textAlign: "center", padding: "0 32px" }}>
          <p style={{ fontFamily: "serif", fontSize: 36, color: "rgba(255,255,255,0.15)", margin: 0 }}>
            Waiting for photos…
          </p>
          <p style={{ fontFamily: "sans-serif", fontSize: 14, color: "rgba(255,255,255,0.15)", margin: 0 }}>
            Guests will share their memories here
          </p>
        </div>
      ) : (
        /* Fix 2: Masonry — photos display at their natural height */
        <div style={{ display: "flex", gap: 8, padding: "8px 8px 56px" }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {col.map((photo) => {
                const isNew = newIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      overflow: "hidden",
                      boxShadow: isNew
                        ? "0 0 0 2px rgba(255,255,255,0.75), 0 0 40px rgba(255,255,255,0.2)"
                        : "none",
                      transition: "box-shadow 0.6s ease",
                    }}
                  >
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.caption || "Wedding photo"}
                      style={{ width: "100%", height: "auto", display: "block" }}
                      loading="lazy"
                      onError={() => setFailedImages((prev) => new Set([...prev, photo.file_path]))}
                    />
                    {/* Name overlay — only for guest uploads */}
                    {!photo.isStatic && photo.uploaded_by && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "20px 10px 8px",
                          background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
                        }}
                      >
                        <p style={{ margin: 0, color: "white", fontSize: 11, fontFamily: "sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {photo.uploaded_by}
                        </p>
                        {photo.caption && (
                          <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    )}

                    {/* NEW badge */}
                    {isNew && (
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          background: "white",
                          color: "black",
                          fontSize: 10,
                          fontWeight: "bold",
                          fontFamily: "sans-serif",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        NEW
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
          background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)",
          pointerEvents: "none",
        }}
      >
        <p style={{ margin: 0, color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "sans-serif", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {visiblePhotos.length} {visiblePhotos.length === 1 ? "memory" : "memories"} shared
        </p>
      </div>
    </div>
  );
};

export default SlideshowPage;
