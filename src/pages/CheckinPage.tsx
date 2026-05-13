import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  AlertTriangle,
  Search,
  QrCode,
  Users,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface GuestResult {
  id: string;
  full_name: string;
  party_size: number;
  checked_in: boolean;
  checked_in_at: string | null;
  invite_code: string;
}

interface CheckinResult {
  success: boolean;
  already_checked_in: boolean;
  guest_name: string;
  party_size: number;
  checked_in_at: string;
  invite_code: string;
}

type Screen = "search" | "confirm" | "result";

const CheckinPage = () => {
  const [screen, setScreen] = useState<Screen>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GuestResult[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<GuestResult | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const didCheckinRef = useRef(false);

  const { toast } = useToast();

  useEffect(() => {
    setHasBarcodeDetector("BarcodeDetector" in window);
  }, []);

  // Debounced name search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = window.setTimeout(async () => {
      const { data } = await (supabase.rpc as any)("search_guests_for_checkin", {
        p_query: searchQuery,
      });
      setSearchResults((data as GuestResult[]) || []);
    }, 300);
  }, [searchQuery]);

  const stopCamera = useCallback(() => {
    didCheckinRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleQRScan = useCallback(
    async (rawValue: string) => {
      if (didCheckinRef.current) return;
      didCheckinRef.current = true;
      stopCamera();
      setScanMode(false);
      setIsLoading(true);
      try {
        const parsed = JSON.parse(rawValue);
        const passId = parsed.pass_id;
        if (!passId) throw new Error("QR code is not a valid wedding pass");
        const { data: result, error } = await (supabase.rpc as any)(
          "checkin_by_pass_id",
          { p_pass_id: passId }
        );
        if (error) throw error;
        setCheckinResult(result as CheckinResult);
        setScreen("result");
      } catch (err: any) {
        toast({
          title: "Invalid QR code",
          description: err.message || "This QR code is not recognised",
          variant: "destructive",
        });
        didCheckinRef.current = false;
      } finally {
        setIsLoading(false);
      }
    },
    [stopCamera, toast]
  );

  const startCamera = useCallback(async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || didCheckinRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) await handleQRScan(codes[0].rawValue);
        } catch {}
      }, 500);
    } catch {
      setCameraError(true);
    }
  }, [handleQRScan]);

  useEffect(() => {
    if (scanMode && hasBarcodeDetector) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [scanMode, hasBarcodeDetector, startCamera, stopCamera]);

  const handleSelectGuest = (guest: GuestResult) => {
    setSelectedGuest(guest);
    setScreen("confirm");
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleCheckinById = async () => {
    if (!selectedGuest) return;
    setIsLoading(true);
    try {
      const { data: result, error } = await (supabase.rpc as any)(
        "checkin_by_guest_id",
        { p_guest_id: selectedGuest.id }
      );
      if (error) throw error;
      setCheckinResult(result as CheckinResult);
      setScreen("result");
    } catch (err: any) {
      toast({
        title: "Check-in failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setScreen("search");
    setSelectedGuest(null);
    setCheckinResult(null);
    setSearchQuery("");
    setSearchResults([]);
    setScanMode(false);
  };

  // ── Search / Scan screen ──────────────────────────────────────────────────
  if (screen === "search") {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-serif text-2xl text-foreground">Guest Check-In</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Search by name{hasBarcodeDetector ? " or scan QR pass" : ""}
            </p>
          </div>

          {hasBarcodeDetector && (
            <div className="flex rounded-xl overflow-hidden border border-border/50 mb-6">
              <button
                onClick={() => setScanMode(false)}
                className={`flex-1 py-3 text-sm font-sans flex items-center justify-center gap-2 transition-colors ${
                  !scanMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="w-4 h-4" />
                Name Search
              </button>
              <button
                onClick={() => setScanMode(true)}
                className={`flex-1 py-3 text-sm font-sans flex items-center justify-center gap-2 transition-colors ${
                  scanMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <QrCode className="w-4 h-4" />
                Scan QR
              </button>
            </div>
          )}

          {/* QR scan mode */}
          {scanMode && hasBarcodeDetector && (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="relative aspect-square bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-2/3 h-2/3 border-2 border-primary rounded-xl" />
                </div>
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/90 text-center px-6">
                    <div>
                      <p className="text-destructive font-medium mb-2">
                        Camera unavailable
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Use name search instead
                      </p>
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-muted-foreground py-4 px-6">
                Point camera at guest's QR pass
              </p>
            </div>
          )}

          {/* Name search mode */}
          {!scanMode && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Type guest name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 rounded-xl py-6 text-base"
                  autoFocus
                />
              </div>

              {searchResults.length > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/20">
                  {searchResults.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => handleSelectGuest(guest)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-primary/5 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {guest.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Party of {guest.party_size} · {guest.invite_code}
                        </p>
                      </div>
                      {guest.checked_in ? (
                        <span className="shrink-0 text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          In
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Arriving
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">
                  No guest found — check spelling or try a shorter name
                </p>
              )}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              to="/"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              ← Back to wedding site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirm screen ────────────────────────────────────────────────────────
  if (screen === "confirm" && selectedGuest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl text-foreground mb-1">
              {selectedGuest.full_name}
            </h2>
            <p className="text-muted-foreground text-sm mb-1">
              Party of <strong>{selectedGuest.party_size}</strong>
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {selectedGuest.invite_code}
            </p>

            {selectedGuest.checked_in && (
              <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 text-yellow-600 text-sm">
                ⚠️ Already checked in at{" "}
                {new Date(selectedGuest.checked_in_at!).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setScreen("search")}
                className="flex-1 rounded-xl border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCheckinById}
                disabled={isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : selectedGuest.checked_in ? (
                  "Re-check In"
                ) : (
                  "Check In ✓"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (screen === "result" && checkinResult) {
    const isAlreadyIn = checkinResult.already_checked_in;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div
            className={`glass-card p-8 text-center border-2 ${
              isAlreadyIn ? "border-yellow-500/40" : "border-green-500/40"
            }`}
          >
            <div
              className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                isAlreadyIn ? "bg-yellow-500/10" : "bg-green-500/10"
              }`}
            >
              {isAlreadyIn ? (
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
              ) : (
                <CheckCircle className="w-10 h-10 text-green-500" />
              )}
            </div>

            <h2 className="font-serif text-2xl text-foreground mb-2">
              {isAlreadyIn ? "Already Checked In" : "Welcome!"}
            </h2>
            <p className="text-xl text-foreground font-medium mb-1">
              {checkinResult.guest_name}
            </p>
            <p className="text-muted-foreground">
              Party of <strong>{checkinResult.party_size}</strong>
            </p>

            {isAlreadyIn && (
              <p className="text-yellow-600 text-sm mt-3">
                First checked in at{" "}
                {new Date(checkinResult.checked_in_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            <Button
              onClick={handleReset}
              className="w-full mt-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6 text-base"
            >
              Next Guest
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CheckinPage;
