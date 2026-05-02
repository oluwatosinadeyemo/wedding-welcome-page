import { useState, useCallback, useEffect } from "react";
import { Camera, Upload, X, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Photo {
  id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
  expires_at: string | null;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const GUEST_NAME_KEY = "wedding_guest_name";
const GUEST_RSVPD_KEY = "wedding_guest_rsvpd";



const PhotoGallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem(GUEST_NAME_KEY) || "";
  });
  const [hasRsvpd, setHasRsvpd] = useState(() => {
    return localStorage.getItem(GUEST_RSVPD_KEY) === "true";
  });
  const { toast } = useToast();

  const hasEnteredName = guestName.trim().length > 0;

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("wedding_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching photos:", error);
      return;
    }

    setPhotos((data as unknown as Photo[]) || []);

    const urls: Record<string, string> = {};
    for (const photo of data || []) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from("wedding-photos")
        .createSignedUrl(photo.file_path, 3600);

      if (!signedError && signedData?.signedUrl) {
        urls[photo.id] = signedData.signedUrl;
      }
    }
    setPhotoUrls(urls);
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

      toast({
        title: "Photo uploaded!",
        description: "Thank you for sharing your memories with us.",
      });

      setCaption("");
      setShowUploadForm(false);
      fetchPhotos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getPhotoUrl = (photoId: string) => {
    return photoUrls[photoId] || "";
  };

  return (
    <section id="gallery" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-background to-card/50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
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

        {/* Guest Actions */}
        <div className="flex flex-col items-center gap-4 mb-12">
          {hasEnteredName && (
            <p className="text-muted-foreground text-sm">
              Sharing as <span className="text-foreground font-medium">{guestName}</span>
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

        {/* Upload Form */}
        {showUploadForm && (
          <div className="max-w-md mx-auto mb-16 animate-fade-in">
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
              </div>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
              >
                <img
                  src={getPhotoUrl(photo.id)}
                  alt={photo.caption || "Wedding photo"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground font-sans">
              No photos yet. Be the first to share a memory!
            </p>
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
            <div className="max-w-4xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={getPhotoUrl(selectedPhoto.id)}
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
                <button
                  onClick={() => {
                    handleDeletePhoto(selectedPhoto);
                    setSelectedPhoto(null);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete photo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PhotoGallery;
