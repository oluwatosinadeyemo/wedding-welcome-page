import { useState, useCallback, useEffect } from "react";
import { Camera, Upload, X, Image as ImageIcon, Loader2, LogIn, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Photo {
  id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
  user_id: string | null;
}

const MAX_PHOTOS_PER_USER = 10;

const PhotoGallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [userPhotoCount, setUserPhotoCount] = useState(0);
  const { toast } = useToast();

  // Check authentication status
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    // Count user's photos for limit display
    if (user) {
      const count = (data || []).filter(p => p.user_id === user.id).length;
      setUserPhotoCount(count);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
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
    } else {
      setPhotos([]);
    }
  }, [fetchPhotos, user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "You can now upload photos to the gallery.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "You're now signed in.",
        });
      }
      setShowAuthForm(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload photos",
        variant: "destructive",
      });
      return;
    }

    if (userPhotoCount >= MAX_PHOTOS_PER_USER) {
      toast({
        title: "Upload limit reached",
        description: `You can only upload ${MAX_PHOTOS_PER_USER} photos maximum.`,
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

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // Store files in user-specific folder for storage RLS
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("wedding-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save to database with user_id
      const { error: dbError } = await supabase.from("wedding_photos").insert({
        file_path: filePath,
        file_name: file.name,
        uploaded_by: uploaderName || user.email?.split("@")[0] || "Guest",
        caption: caption || null,
        user_id: user.id,
      });

      if (dbError) throw dbError;

      toast({
        title: "Photo uploaded!",
        description: "Thank you for sharing your memories with us.",
      });

      setUploaderName("");
      setCaption("");
      setShowUploadForm(false);
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

  const handleDeletePhoto = async (photo: Photo) => {
    if (!user || photo.user_id !== user.id) {
      toast({
        title: "Cannot delete",
        description: "You can only delete your own photos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("wedding-photos")
        .remove([photo.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("wedding_photos")
        .delete()
        .eq("id", photo.id);

      if (dbError) throw dbError;

      toast({
        title: "Photo deleted",
        description: "The photo has been removed from the gallery.",
      });
      
      setSelectedPhoto(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
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
            Share your favorite moments from our celebration. Sign in to upload photos and create lasting memories together.
          </p>
        </div>

        {/* Auth Status & Actions */}
        <div className="flex flex-col items-center gap-4 mb-12">
          {user ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground text-sm">
                Signed in as <span className="text-foreground">{user.email}</span>
                <span className="ml-2 text-primary">
                  ({userPhotoCount}/{MAX_PHOTOS_PER_USER} photos uploaded)
                </span>
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-full text-sm uppercase tracking-wider font-sans"
                  disabled={userPhotoCount >= MAX_PHOTOS_PER_USER}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Share a Photo
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="px-6 py-6 rounded-full text-sm uppercase tracking-wider font-sans"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground text-sm">
                Sign in to view and share photos
              </p>
              <Button
                onClick={() => setShowAuthForm(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-full text-sm uppercase tracking-wider font-sans"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Sign In to Gallery
              </Button>
            </div>
          )}
        </div>

        {/* Auth Form */}
        {showAuthForm && !user && (
          <div className="max-w-md mx-auto mb-16 animate-fade-in">
            <div className="glass-card p-8">
              <h3 className="font-serif text-2xl text-foreground mb-6 text-center">
                {authMode === "login" ? "Welcome Back" : "Create Account"}
              </h3>
              <form onSubmit={handleAuth} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="bg-background/50 border-border/50 rounded-xl"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-background/50 border-border/50 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6"
                >
                  {isAuthLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : authMode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                  className="text-primary hover:underline text-sm"
                >
                  {authMode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAuthForm(false)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && user && (
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

        {/* Photo Grid - Only visible to authenticated users */}
        {user ? (
          photos.length > 0 ? (
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
                  {photo.user_id === user.id && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-2 py-1 bg-primary/80 rounded-full text-xs text-primary-foreground">
                        Your photo
                      </span>
                    </div>
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
                No photos yet. Be the first to share a memory!
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground font-sans">
              Sign in to view and share photos from the wedding
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
                {user && selectedPhoto.user_id === user.id && (
                  <Button
                    onClick={() => handleDeletePhoto(selectedPhoto)}
                    variant="destructive"
                    size="sm"
                    className="mt-4"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Photo
                  </Button>
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
