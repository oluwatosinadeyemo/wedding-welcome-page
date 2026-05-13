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

interface ScanEntry {
  id: string;
  scanned_at: string;
  label: string | null;
  raw_value: string;
}

const CheckinPage = () => {
  const [scanMode, setScanMode] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [label, setLabel] = useState("");
  const [log, setLog] = useState<ScanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    setHasBarcodeDetector("BarcodeDetector" in window);
  }, []);

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

  const recordScan = useCallback(async (rawValue: string, overrideLabel?: string) => {
    const entry = {
      raw_value: rawValue,
      label: overrideLabel ?? (label.trim() || null),
    };
    const { data, error } = await (supabase.from("scan_log" as any) as any)
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    setLog((prev) => [data as ScanEntry, ...prev]);
    setLabel("");
    setManualInput("");
  }, [label]);

  const handleQRScan = useCallback(
    async (rawValue: string) => {
      if (cooldownRef.current || rawValue === lastScannedRef.current) return;
      cooldownRef.current = true;
      lastScannedRef.current = rawValue;

      // Extract a human-readable label from QR data if possible
      let displayLabel: string | undefined;
      try {
        const parsed = JSON.parse(rawValue);
        displayLabel = parsed.name || parsed.guest_name || parsed.pass_id || undefined;
      } catch {
        // raw string — use as-is
      }

      setIsLoading(true);
      try {
        await recordScan(rawValue, displayLabel);
        toast({ title: "Scanned", description: displayLabel || rawValue.slice(0, 40) });
      } catch (err: any) {
        toast({ title: "Scan failed", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          cooldownRef.current = false;
          lastScannedRef.current = "";
        }, 2000);
      }
    },
    [recordScan, toast]
  );

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

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
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setIsLoading(true);
    try {
      await recordScan(manualInput.trim());
      toast({ title: "Logged", description: manualInput.trim().slice(0, 40) });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
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
        {hasBarcodeDetector && (
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
        )}

        {/* Camera */}
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
                    <p className="text-destructive font-medium mb-2">Camera unavailable</p>
                    <p className="text-muted-foreground text-sm">Use manual entry instead</p>
                  </div>
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground py-3 px-6">
              Point camera at guest's QR pass
            </p>
          </div>
        )}

        {/* Manual entry */}
        {(!scanMode || !hasBarcodeDetector) && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Input
              placeholder="Name or invite code"
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Entry"}
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
                        {entry.label || entry.raw_value.slice(0, 30)}
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
          <Link to="/" className="text-muted-foreground text-sm hover:text-foreground">
            ← Back to wedding site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckinPage;
