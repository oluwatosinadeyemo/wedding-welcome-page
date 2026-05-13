import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Camera, Upload, X, Image as ImageIcon, Loader2, Trash2, ChevronLeft, ChevronRight, Play, Pause, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
  expires_at: string | null;
  category: string | null;
  isStatic?: boolean;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const GUEST_NAME_KEY = "wedding_guest_name";
const GUEST_UPLOADS_KEY = "wedding_guest_uploads";
const SLIDESHOW_INTERVAL_MS = 4000;

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

const STATIC_PREWEDDING: Photo[] = [
  {
    id: "static-prewedding-1",
    file_path: "/prewedding/DAP_8980.jpg",
    file_name: "DAP_8980.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-2",
    file_path: "/prewedding/DAP_9007.jpg",
    file_name: "DAP_9007.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-3",
    file_path: "/prewedding/DAP_9213.jpg",
    file_name: "DAP_9213.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-4",
    file_path: "/prewedding/DAP_9459.jpg",
    file_name: "DAP_9459.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-5",
    file_path: "/prewedding/DAP_9153.jpg",
    file_name: "DAP_9153.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-6",
    file_path: "/prewedding/DAP_9195.jpg",
    file_name: "DAP_9195.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-7",
    file_path: "/prewedding/DAP_9392.jpg",
    file_name: "DAP_9392.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
  {
    id: "static-prewedding-8",
    file_path: "/prewedding/DAP_9451.jpg",
    file_name: "DAP_9451.jpg",
    uploaded_by: null,
    caption: null,
    created_at: "",
    expires_at: null,
    category: "prewedding",
    isStatic: true,
  },
];

type FilterKey = "engagement" | "prewedding" | "weddingday";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "prewedding", label: "Pre-wedding" },
  { key: "weddingday", label: "Wedding day" },
];

const PhotoGallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("prewedding");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const slideshowTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [guestUploads, setGuestUploads] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(GUEST_UPLOADS_KEY) || "[]")
  );
  const [guestName, setGuestName] = useState(() =>
    localStorage.getItem(GUEST_NAME_KEY) || ""
  );
  const { toast } = useToast();

  const hasEnteredName = guestName.trim().length > 0;

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email?.toLowerCase() ?? "";
      setIsAdmin(ADMIN_EMAILS.includes(email));
    };
    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      const email = session?.user?.email?.toLowerCase() ?? "";
      setIsAdmin(ADMIN_EMAILS.includes(email));
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("wedding_photos")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) console.error("Error fetching photos:", error);
      return;
    }

    setPhotos((data as unknown as Photo[]) || []);
  }, []);

  useEffect(() => {
    fetchPhotos();

    const channel = supabase
      .channel("wedding-photos-changes")
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

  const PHOTOS_PER_PAGE = 12;

  const filteredPhotos = useMemo(() => {
    let list: Photo[];
    if (activeFilter === "prewedding") {
      const dbPrewedding = photos.filter(
        (p) => (p.category || "").toLowerCase() === "prewedding"
      );
      list = [...STATIC_PREWEDDING, ...dbPrewedding];
    } else if (activeFilter === "weddingday") {
      list = photos.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        return cat === "weddingday" || cat === "";
      });
    } else {
      list = photos.filter(
        (p) => (p.category || "").toLowerCase() === activeFilter
      );
    }
    const seen = new Set<string>();
    return list.filter((p) => {
      if (seen.has(p.file_path)) return false;
      seen.add(p.file_path);
      if (failedImages.has(p.file_path)) return false;
      return true;
    });
  }, [photos, activeFilter, failedImages]);

  const totalPages = Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = filteredPhotos.slice(
    (currentPage - 1) * PHOTOS_PER_PAGE,
    currentPage * PHOTOS_PER_PAGE
  );

  const selectedPhoto = selectedIndex !== null ? filteredPhotos[selectedIndex] ?? null : null;

  const stopSlideshow = useCallback(() => {
    if (slideshowTimer.current) {
      clearInterval(slideshowTimer.current);
      slideshowTimer.current = null;
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setIsPlaying(false);
    setSlideProgress(0);
  }, []);

  const navigateLightbox = useCallback((dir: 1 | -1) => {
    setSelectedIndex((idx) => {
      if (idx === null) return null;
      const next = idx + dir;
      if (next < 0 || next >= filteredPhotos.length) return idx;
      return next;
    });
    setSlideProgress(0);
  }, [filteredPhotos.length]);

  const startSlideshow = useCallback(() => {
    setIsPlaying(true);
    setSlideProgress(0);

    const tickMs = 50;
    const steps = SLIDESHOW_INTERVAL_MS / tickMs;
    let step = 0;

    progressTimer.current = setInterval(() => {
      step += 1;
      setSlideProgress((step / steps) * 100);
    }, tickMs);

    slideshowTimer.current = setInterval(() => {
      step = 0;
      setSlideProgress(0);
      setSelectedIndex((idx) => {
        if (idx === null) return null;
        const next = idx + 1;
        if (next >= filteredPhotos.length) return 0;
        return next;
      });
    }, SLIDESHOW_INTERVAL_MS);
  }, [filteredPhotos.length]);

  const toggleSlideshow = useCallback(() => {
    if (isPlaying) {
      stopSlideshow();
    } else {
      startSlideshow();
    }
  }, [isPlaying, startSlideshow, stopSlideshow]);

  useEffect(() => {
    return () => stopSlideshow();
  }, [stopSlideshow]);

  useEffect(() => {
    if (selectedIndex === null) {
      stopSlideshow();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { navigateLightbox(1); }
      else if (e.key === "ArrowLeft") { navigateLightbox(-1); }
      else if (e.key === "Escape") { setSelectedIndex(null); }
      else if (e.key === " ") { e.preventDefault(); toggleSlideshow(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, navigateLightbox, toggleSlideshow]);

  const canDeletePhoto = (photo: Photo) => {
    if (photo.isStatic) return false;
    if (isAdmin) return true;
    if (activeFilter === "weddingday" && guestUploads.includes(photo.file_path))
      return true;
    return false;
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!canDeletePhoto(photo)) return;
    setIsDeletingPhoto(photo.id);
    try {
      await supabase.storage.from("wedding-photos").remove([photo.file_path]);
      await supabase.from("wedding_photos").delete().eq("id", photo.id);
      const newUploads = guestUploads.filter((fp) => fp !== photo.file_path);
      setGuestUploads(newUploads);
      localStorage.setItem(GUEST_UPLOADS_KEY, JSON.stringify(newUploads));
      fetchPhotos();
      toast({ title: "Photo deleted" });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingPhoto(null);
    }
  };

  const handleShareClick = () => {
    setShowUploadForm(!showUploadForm);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasEnteredName) {
      toast({
        title: "Name required",
        description: "Please enter your name before uploading.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: `Please upload an image under ${MAX_FILE_SIZE_MB}MB`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `guest/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("wedding-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: rpcError } = await (supabase.rpc as any)("submit_guest_photo", {
        p_full_name: guestName,
        p_file_path: filePath,
        p_file_name: file.name,
        p_caption: caption || null,
      });

      if (rpcError) throw rpcError;

      const newUploads = [...guestUploads, filePath];
      setGuestUploads(newUploads);
      localStorage.setItem(GUEST_UPLOADS_KEY, JSON.stringify(newUploads));

      toast({
        title: "Photo submitted!",
        description: "Thanks! Your photo will appear once the couple approves it.",
      });

      setCaption("");
      setShowUploadForm(false);
      fetchPhotos();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getPhotoUrl = (photo: Photo) => {
    if (photo.isStatic) return photo.file_path;
    return supabase.storage.from("wedding-photos").getPublicUrl(photo.file_path)
      .data.publicUrl;
  };

  return (
    <section id="gallery" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-background to-card/50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <p className="text-primary font-sans uppercase tracking-[0.2em] text-sm mb-4 font-medium">
            Memories
          </p>
          <h2 className="font-serif text-3xl sm:text-5xl md:text-7xl text-foreground mb-4 font-medium">
            Photo Gallery
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            Browse our wedding memories or share your own photos.
          </p>
        </div>

        {/* Filter Tabs + TV Mode button */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setActiveFilter(f.key);
                setCurrentPage(1);
                setShowUploadForm(false);
              }}
              className={cn(
                "px-5 py-2 rounded-full text-sm uppercase tracking-wider font-sans border transition-all duration-300",
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-lg"
                  : "bg-background/40 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}

          <a
            href="/slideshow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm uppercase tracking-wider font-sans border border-border/50 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all duration-300"
            title="Open TV / HDMI slideshow mode"
          >
            <Tv className="w-4 h-4" />
            TV Mode
          </a>
        </div>

        {/* Upload Form */}
        {activeFilter === "weddingday" && showUploadForm && (
          <div className="max-w-md mx-auto mb-12 animate-fade-in">
            <div className="glass-card p-8">
              <h3 className="font-serif text-2xl text-foreground mb-6 text-center">
                Upload Your Photo
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Your name"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    localStorage.setItem(GUEST_NAME_KEY, e.target.value);
                  }}
                  className="bg-background/50 border-border/50 rounded-xl"
                />
                <Input
                  placeholder="Caption (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-background/50 border-border/50 rounded-xl"
                />
                <label className="block">
                  <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-muted-foreground">Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-primary" />
                        <span className="text-foreground">Click to upload</span>
                        <span className="text-muted-foreground text-sm">
                          JPG, PNG, GIF up to 50MB
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-muted-foreground text-center">
                  Submitted photos appear after the couple approves them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedIndex(filteredPhotos.indexOf(photo))}
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption || "Wedding photo"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={() => setFailedImages((prev) => new Set([...prev, photo.file_path]))}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-foreground text-sm font-sans truncate">
                    {photo.uploaded_by || "Guest"}
                  </p>
                  {photo.caption && (
                    <p className="text-muted-foreground text-xs truncate">
                      {photo.caption}
                    </p>
                  )}
                </div>
                {canDeletePhoto(photo) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    disabled={isDeletingPhoto === photo.id}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {isDeletingPhoto === photo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground font-sans">
              {activeFilter === "weddingday"
                ? "No photos yet. Be the first to share a memory!"
                : "No photos yet."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-full text-sm font-sans transition-all ${
                  page === currentPage
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Share a Photo button */}
        {activeFilter === "weddingday" && (
          <div className="flex flex-col items-center gap-4 mt-12">
            {hasEnteredName && (
              <p className="text-muted-foreground text-sm">
                Sharing as{" "}
                <span className="text-foreground font-medium">{guestName}</span>
              </p>
            )}
            <Button
              onClick={handleShareClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-full text-sm uppercase tracking-wider font-sans"
            >
              <Camera className="w-5 h-5 mr-2" />
              Share a Photo
            </Button>
          </div>
        )}

        {/* Lightbox — rendered via portal to avoid stacking context issues */}
        {selectedPhoto && selectedIndex !== null && createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={() => { setSelectedIndex(null); }}
          >
            {/* Slideshow progress bar */}
            {isPlaying && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
                <div
                  className="h-full bg-primary transition-none"
                  style={{ width: `${slideProgress}%` }}
                />
              </div>
            )}

            {/* Dedicated close button — top right */}
            <button
              className="absolute top-4 right-4 z-20 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors shadow-lg"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Top-left controls: counter + play/pause + TV */}
            <div
              className="absolute top-4 left-4 z-20 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-white/50 text-sm font-sans tabular-nums px-2">
                {selectedIndex + 1} / {filteredPhotos.length}
              </span>
              <button
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={toggleSlideshow}
                title={isPlaying ? "Pause slideshow (Space)" : "Play slideshow (Space)"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <a
                href="/slideshow"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Open TV / HDMI mode"
                onClick={(e) => e.stopPropagation()}
              >
                <Tv className="w-4 h-4" />
              </a>
            </div>

            {/* Prev arrow */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed z-10"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className="w-7 h-7" />
            </button>

            {/* Next arrow */}
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed z-10"
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              disabled={selectedIndex === filteredPhotos.length - 1}
            >
              <ChevronRight className="w-7 h-7" />
            </button>

            {/* Image */}
            <div
              className="flex flex-col items-center max-w-5xl w-full px-20 py-16"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                key={selectedPhoto.id}
                src={getPhotoUrl(selectedPhoto)}
                alt={selectedPhoto.caption || "Wedding photo"}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                onError={() => setFailedImages((prev) => new Set([...prev, selectedPhoto.file_path]))}
              />
              {(selectedPhoto.uploaded_by || selectedPhoto.caption) && (
                <div className="text-center mt-5">
                  {selectedPhoto.uploaded_by && (
                    <p className="text-white/80 font-sans text-sm">
                      {selectedPhoto.uploaded_by}
                    </p>
                  )}
                  {selectedPhoto.caption && (
                    <p className="text-white/50 text-xs mt-1">{selectedPhoto.caption}</p>
                  )}
                </div>
              )}
            </div>

            {/* Dot indicators (up to 20) */}
            {filteredPhotos.length <= 20 && (
              <div
                className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {filteredPhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedIndex(i); setSlideProgress(0); }}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === selectedIndex
                        ? "w-5 h-1.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                    )}
                  />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </section>
  );
};

export default PhotoGallery;
