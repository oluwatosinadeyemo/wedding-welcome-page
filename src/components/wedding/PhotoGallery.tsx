import { useState, useCallback, useEffect, useMemo } from "react";
import { Camera, Upload, X, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
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
const GUEST_RSVPD_KEY = "wedding_guest_rsvpd";
const GUEST_UPLOADS_KEY = "wedding_guest_uploads";

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
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("engagement");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [guestUploads, setGuestUploads] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(GUEST_UPLOADS_KEY) || "[]")
  );
  const [guestName, setGuestName] = useState(() =>
    localStorage.getItem(GUEST_NAME_KEY) || ""
  );
  const [hasRsvpd] = useState(() =>
    localStorage.getItem(GUEST_RSVPD_KEY) === "true"
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

  const filteredPhotos = useMemo(() => {
    if (activeFilter === "prewedding") {
      const dbPrewedding = photos.filter(
        (p) => (p.category || "").toLowerCase() === "prewedding"
      );
      return [...STATIC_PREWEDDING, ...dbPrewedding];
    }
    if (activeFilter === "weddingday") {
      return photos.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        return cat === "weddingday" || cat === "";
      });
    }
    return photos.filter(
      (p) => (p.category || "").toLowerCase() === activeFilter
    );
  }, [photos, activeFilter]);

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
      {/* Background */}
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

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setActiveFilter(f.key);
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
        </div>

        {/* Upload Form — Wedding day tab only, shown above grid when open */}
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
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-2xl overflow-hidden"
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption || "Wedding photo"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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

        {/* Share a Photo button — only on Wedding day tab, below the grid */}
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

        {/* Lightbox */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-card/80 flex items-center justify-center text-foreground hover:bg-card transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="max-w-4xl max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getPhotoUrl(selectedPhoto)}
                alt={selectedPhoto.caption || "Wedding photo"}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl"
              />
              <div className="text-center mt-4">
                <p className="text-foreground font-sans">
                  {selectedPhoto.uploaded_by || "Guest"}
                </p>
                {selectedPhoto.caption && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedPhoto.caption}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PhotoGallery;
