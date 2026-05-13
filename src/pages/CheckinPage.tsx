import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  QrCode,
  Search,
  Loader2,
  Trash2,
  Download,
} from "lucide-react";
import jsQR from "jsqr";

interface ScanEntry {
  id: string;
  scanned_at: string;
  label: string | null;
  raw_value: string;
  pass_id?: string | null;
  already_checked_in?: boolean;
}

const CheckinPage = () => {
  const [scanMode, setScanMode] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [label, setLabel] = useState("");
  const [log, setLog] = useState<ScanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);

  const { toast } = useToast();

  // Load today's scans on mount
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    (supabase.from("scan_log" as any) as any)
      .select("*")
      .gte("scanned_at", today.toISOString())
      .order("scanned_at", { ascending: false })
      .then(({ data }: { data: ScanEntry[] | null }) => {
        if (data) setLog(data);
      });
  }, []);

  const recordScan = useCallback(
    async (rawValue: string, overrideLabel?: string, passId?: string): Promise<ScanEntry> => {
      const resolvedLabel = (overrideLabel ?? label.trim()) || null;
      const { data, error } = await (supabase.rpc as any)("insert_scan_log", {
        p_raw_value: rawValue,
        p_label: resolvedLabel,
        p_pass_id: passId ?? null,
      });
      if (error) throw error;
      const entry = data as ScanEntry;
      // Only add to log if it's a new scan
      if (!entry.already_checked_in) {
        setLog((prev) => [entry, ...prev]);
      }
      setLabel("");
      setManualInput("");
      return entry;
    },
    [label]
  );

  const handleQRScan = useCallback(
    async (rawValue: string) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;

      let displayLabel: string | undefined;
      let passId: string | undefined;
      try {
        const parsed = JSON.parse(rawValue);
        passId = parsed.pass_id || undefined;
        // fallback label from QR data if available
        displayLabel = parsed.name || parsed.guest_name || undefined;
      } catch { /* raw string — not a pass QR */ }

      setIsLoading(true);
      try {
        const entry = await recordScan(rawValue, displayLabel, passId);
        if (entry.already_checked_in) {
          toast({
            title: "⚠️ Already checked in",
            description: `${entry.label || "This guest"} was already scanned at ${new Date(entry.scanned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "✓ Checked in",
            description: entry.label || rawValue.slice(0, 50),
          });
        }
      } catch (err: any) {
        toast({
          title: "Scan failed",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          cooldownRef.current = false;
        }, 2500);
      }
    },
    [recordScan, toast]
  );

  // jsQR scan loop — works in all browsers
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code && !cooldownRef.current) {
      handleQRScan(code.data);
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [handleQRScan]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and reload."
          : "Camera unavailable. Use manual entry below."
      );
    }
  }, [scanFrame]);

  useEffect(() => {
    if (scanMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [scanMode, startCamera, stopCamera]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setIsLoading(true);
    try {
      const entry = await recordScan(manualInput.trim());
      toast({ title: "Logged", description: entry.label || manualInput.trim().slice(0, 50) });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("scan_log" as any) as any).delete().eq("id", id);
    setLog((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExportCSV = () => {
    const rows = [
      ["Time", "Label", "Raw Value"].join(","),
      ...log.map((e) =>
        [
          new Date(e.scanned_at).toLocaleString(),
          `"${(e.label || "").replace(/"/g, '""')}"`,
          `"${e.raw_value.replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-serif text-2xl text-foreground">Guest Check-In</h1>
          <p className="text-muted-foreground text-sm mt-1">
            T &amp; P · December 12, 2026
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-xl overflow-hidden border border-border/50">
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
          <button
            onClick={() => setScanMode(false)}
            className={`flex-1 py-3 text-sm font-sans flex items-center justify-center gap-2 transition-colors ${
              !scanMode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="w-4 h-4" />
            Manual Entry
          </button>
        </div>

        {/* Camera */}
        {scanMode && (
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {/* hidden canvas used by jsQR */}
              <canvas ref={canvasRef} className="hidden" />

              {/* viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 h-2/3 border-2 border-primary rounded-xl" />
              </div>

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/90 text-center px-6">
                  <div>
                    <p className="text-destructive font-medium mb-2">
                      {cameraError}
                    </p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground py-3 px-6">
              Point camera at guest's QR pass
            </p>
          </div>
        )}

        {/* Manual entry */}
        {!scanMode && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Input
              placeholder="Name or label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-background/50 border-border/50 rounded-xl py-5"
            />
            <Input
              placeholder="Raw value / QR data"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              required
              className="bg-background/50 border-border/50 rounded-xl py-5"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Log Entry"
              )}
            </Button>
          </form>
        )}

        {/* Log */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-foreground">
              Today's Log{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({log.length})
              </span>
            </h2>
            {log.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="border-border/50 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Export CSV
              </Button>
            )}
          </div>

          {log.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No scans yet — start scanning to log arrivals
            </p>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/20">
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.label || entry.raw_value.slice(0, 40)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.scanned_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
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
};

export default CheckinPage;
