import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize, Minimize, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  id: string;
  file_path: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
  isStatic?: boolean;
}

const SLIDE_DURATION_MS = 5000;

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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true); // for fade transition
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wake lock — keep screen on
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try { wakeLock = await navigator.wakeLock.request("screen"); } catch { /* unsupported */ }
    };
    acquire();
    const onVisibility = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { wakeLock?.release(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  // Fullscreen API
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  // Data fetching + realtime
  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("wedding_photos")
      .select("id, file_path, uploaded_by, caption, created_at")
      .order("created_at", { ascending: false });

    if (error) { setIsLoading(false); return; }

    const dbPhotos = (data as Photo[]) || [];
    const fresh = dbPhotos.filter((p) => !knownIds.current.has(p.id)).map((p) => p.id);
    dbPhotos.forEach((p) => knownIds.current.add(p.id));

    if (fresh.length > 0 && knownIds.current.size > fresh.length) {
      setNewIds(new Set(fresh));
      setTimeout(() => setNewIds(new Set()), 6000);
    }

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wedding_photos" }, () => fetchPhotos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPhotos]);

  const visiblePhotos = useMemo(
    () => photos.filter((p) => !failedImages.has(p.file_path)),
    [photos, failedImages]
  );

  const stopTimers = useCallback(() => {
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  }, []);

  const goTo = useCallback((idx: number) => {
    stopTimers();
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex(idx);
      setProgress(0);
      setVisible(true);
    }, 300);
  }, [stopTimers]);

  // When a new photo arrives via realtime, jump to it
  useEffect(() => {
    if (newIds.size === 0 || visiblePhotos.length === 0) return;
    const newIdx = visiblePhotos.findIndex((p) => newIds.has(p.id));
    if (newIdx !== -1) goTo(newIdx);
  }, [newIds, visiblePhotos, goTo]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => {
      const next = visiblePhotos.length === 0 ? 0 : (i + 1) % visiblePhotos.length;
      return next;
    });
    setProgress(0);
    setVisible(false);
    setTimeout(() => setVisible(true), 300);
  }, [visiblePhotos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => {
      const prev = visiblePhotos.length === 0 ? 0 : (i - 1 + visiblePhotos.length) % visiblePhotos.length;
      return prev;
    });
    setProgress(0);
    setVisible(false);
    setTimeout(() => setVisible(true), 300);
  }, [visiblePhotos.length]);

  // Auto-advance + progress bar
  useEffect(() => {
    if (visiblePhotos.length === 0) return;
    stopTimers();
    setProgress(0);

    const tickMs = 50;
    const steps = SLIDE_DURATION_MS / tickMs;
    let step = 0;

    progressTimer.current = setInterval(() => {
      step += 1;
      setProgress((step / steps) * 100);
    }, tickMs);

    advanceTimer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % visiblePhotos.length);
        setProgress(0);
        setVisible(true);
      }, 300);
    }, SLIDE_DURATION_MS);

    return stopTimers;
  }, [currentIndex, visiblePhotos.length, stopTimers]);

  // Clamp index when photos change
  useEffect(() => {
    if (visiblePhotos.length > 0 && currentIndex >= visiblePhotos.length) {
      setCurrentIndex(0);
    }
  }, [visiblePhotos.length, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const photo = visiblePhotos[currentIndex] ?? null;
  const isNew = photo ? newIds.has(photo.id) : false;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "white", overflow: "hidden", userSelect: "none" }}>

      {/* Full-screen photo */}
      {photo && (
        <img
          key={photo.id}
          src={getPhotoUrl(photo)}
          alt={photo.caption || "Wedding photo"}
          onError={() => setFailedImages((prev) => new Set([...prev, photo.file_path]))}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transition: "opacity 0.3s ease",
            opacity: visible ? 1 : 0,
            background: "#000",
          }}
        />
      )}

      {/* Dark gradient overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />

      {/* Progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)", zIndex: 10 }}>
        <div style={{ height: "100%", background: "rgba(255,255,255,0.7)", width: `${progress}%`, transition: "width 0.05s linear" }} />
      </div>

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", zIndex: 10 }}>
        <span style={{ fontFamily: "serif", fontSize: 20, letterSpacing: "0.15em", color: "rgba(255,255,255,0.8)" }}>
          T &amp; P
        </span>
        <span style={{ fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
          #T&amp;P2026
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {visiblePhotos.length > 0 && (
            <span style={{ fontFamily: "sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {currentIndex + 1} / {visiblePhotos.length}
            </span>
          )}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Prev / Next arrows */}
      {visiblePhotos.length > 1 && (
        <>
          <button
            onClick={goPrev}
            style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goNext}
            style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Caption overlay — bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px 20px", zIndex: 10 }}>
        {photo && !photo.isStatic && photo.uploaded_by && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {photo.uploaded_by}
            </p>
            {photo.caption && (
              <p style={{ margin: "2px 0 0", fontFamily: "sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {photo.caption}
              </p>
            )}
          </div>
        )}
        <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {visiblePhotos.length} {visiblePhotos.length === 1 ? "memory" : "memories"} · December 12, 2026
        </p>
      </div>

      {/* NEW badge */}
      {isNew && (
        <div style={{ position: "absolute", top: 64, left: 24, background: "white", color: "black", fontSize: 11, fontWeight: "bold", fontFamily: "sans-serif", padding: "3px 10px", borderRadius: 999, zIndex: 10 }}>
          NEW
        </div>
      )}

      {/* Loading / empty states */}
      {isLoading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      )}
      {!isLoading && visiblePhotos.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 20 }}>
          <p style={{ fontFamily: "serif", fontSize: 36, color: "rgba(255,255,255,0.15)", margin: 0 }}>Waiting for photos…</p>
          <p style={{ fontFamily: "sans-serif", fontSize: 14, color: "rgba(255,255,255,0.15)", margin: 0 }}>Guests will share their memories here</p>
        </div>
      )}
    </div>
  );
};

export default SlideshowPage;
