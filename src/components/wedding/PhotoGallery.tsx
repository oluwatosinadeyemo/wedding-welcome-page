import { useState, useCallback, useEffect } from "react";
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
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
}

const PhotoGallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { toast } = useToast();

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("wedding_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching photos:", error);
      return;
    }

    setPhotos(data || []);
  }, []);

  useEffect(() => {
    fetchPhotos();

    // Subscribe to realtime updates
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("wedding-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase.from("wedding_photos").insert({
        file_path: filePath,
        file_name: file.name,
        uploaded_by: uploaderName || "Anonymous Guest",
        caption: caption || null,
      });

      if (dbError) throw dbError;

      toast({
        title: "Photo uploaded!",
        description: "Thank you for sharing your memories with us.",
      });

      setUploaderName("");
      setCaption("");
      setShowUploadForm(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("wedding-photos")
      .getPublicUrl(filePath);
    return data.publicUrl;
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
          <h2 className="font-serif text-5xl md:text-7xl text-foreground mb-4 font-medium">
            Photo Gallery
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            Share your favorite moments from our celebration. Upload photos to create lasting memories together.
          </p>
        </div>

        {/* Upload Button */}
        <div className="flex justify-center mb-12">
          <Button
            onClick={() => setShowUploadForm(!showUploadForm)}
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
                  placeholder="Your name (optional)"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
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
                          JPG, PNG, GIF up to 10MB
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
                  src={getPublicUrl(photo.file_path)}
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
                src={getPublicUrl(selectedPhoto.file_path)}
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
