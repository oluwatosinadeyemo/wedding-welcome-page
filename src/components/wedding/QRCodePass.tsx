import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Ticket, User, Calendar, MapPin, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GuestPassData {
  id: string;
  full_name: string;
  party_size: number;
  has_rsvp: boolean;
  rsvp_attending: string | null;
  has_pass: boolean;
}

const QRCodePass = () => {
  const [guestName, setGuestName] = useState("");
  const [guest, setGuest] = useState<GuestPassData | null>(null);
  const [passId, setPassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [step, setStep] = useState<"lookup" | "generate" | "display">("lookup");

  const handleLookup = async () => {
    if (!guestName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)(
        "lookup_guest_by_name",
        { guest_name: guestName.trim() }
      );

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        setError("No RSVP found for that name. Please RSVP first.");
        return;
      }

      const result = data[0] as GuestPassData;
      setGuest(result);

      if (result.rsvp_attending !== "yes") {
        setStep("generate");
      } else if (result.has_pass) {
        const { data: guestRow } = await (supabase
          .from("guests" as any) as any)
          .select("pass_id")
          .eq("id", result.id)
          .single();

        if (guestRow?.pass_id) {
          setPassId(guestRow.pass_id);
          setStep("display");
        } else {
          setStep("generate");
        }
      } else {
        setStep("generate");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePass = async () => {
    if (!guest) return;
    setIsGenerating(true);

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)("generate_pass_by_guest_id", {
        p_guest_id: guest.id,
      });

      if (rpcError) throw rpcError;

      setPassId(data as string);
      setStep("display");
      toast({
        title: "Pass Generated!",
        description: "Your digital wedding pass is ready.",
      });
    } catch (err: any) {
      toast({
        title: "Could not generate pass",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQRValue = () => {
    return JSON.stringify({
      pass_id: passId,
      guest: guest?.full_name || "Guest",
      event: "Tosin & Pelumi Wedding",
      date: "2026-12-12",
    });
  };

  const downloadPass = () => {
    const svg = document.getElementById("wedding-qr-code");
    if (!svg || !guest) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 620;

      if (ctx) {
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
        gradient.addColorStop(1, "rgba(168, 85, 247, 0.1)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px 'Playfair Display', serif";
        ctx.textAlign = "center";
        ctx.fillText("Wedding Pass", canvas.width / 2, 50);

        ctx.font = "italic 32px 'Playfair Display', serif";
        ctx.fillText("Tosin & Pelumi", canvas.width / 2, 100);

        ctx.drawImage(img, (canvas.width - 200) / 2, 130, 200, 200);

        ctx.font = "18px Inter, sans-serif";
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText("Guest", canvas.width / 2, 370);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Inter, sans-serif";
        ctx.fillText(guest.full_name, canvas.width / 2, 400);

        ctx.fillStyle = "#a1a1aa";
        ctx.font = "14px Inter, sans-serif";
        ctx.fillText("December 12, 2026 | 10:00 AM", canvas.width / 2, 460);
        ctx.fillText("Lambs Event Centre, Abeokuta", canvas.width / 2, 490);

        ctx.font = "12px Inter, sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("Present this pass at the venue entrance", canvas.width / 2, 550);

        if (passId) {
          ctx.font = "10px Inter, sans-serif";
          ctx.fillStyle = "#4b5563";
          ctx.fillText(`Pass ID: ${passId.substring(0, 8)}...`, canvas.width / 2, 580);
        }
      }

      const link = document.createElement("a");
      link.download = `wedding-pass-${guest.full_name.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleStartOver = () => {
    setStep("lookup");
    setGuestName("");
    setPassId(null);
    setGuest(null);
    setError(null);
  };

  return (
    <section id="pass" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary font-sans uppercase tracking-[0.2em] text-sm mb-4 font-medium">
            Your Invitation
          </p>
          <h2 className="font-serif text-3xl sm:text-5xl md:text-7xl text-foreground mb-4 font-medium">
            Digital Pass
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            Generate your personalized wedding pass. Show the QR code at the venue entrance for seamless check-in.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          {/* Step 1: Name Lookup */}
          {step === "lookup" && (
            <div className="glass-card p-8 animate-fade-in">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
                <Ticket className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif text-2xl text-foreground mb-2 text-center">
                Get Your Pass
              </h3>
              <p className="text-muted-foreground text-sm text-center mb-6">
                Enter the name you used when you RSVP'd
              </p>
              <div className="space-y-4">
                <Input
                  placeholder="Enter your full name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  className="bg-background/50 border-border/50 rounded-xl text-center text-lg py-6"
                  autoFocus
                />
                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}
                <Button
                  onClick={handleLookup}
                  disabled={!guestName.trim() || isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Find My Pass"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Generate or RSVP prompt */}
          {step === "generate" && guest && (
            <div className="glass-card p-8 animate-fade-in text-center">
              {guest.rsvp_attending === "yes" ? (
                <>
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
                    <Ticket className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground mb-4">
                    Welcome, {guest.full_name}!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Ready to generate your personalized wedding pass?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleGeneratePass}
                      disabled={isGenerating}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Generate Pass"
                      )}
                    </Button>
                    <Button
                      onClick={handleStartOver}
                      variant="outline"
                      className="py-6 rounded-xl border-border/50"
                    >
                      Back
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary/10">
                    <User className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground mb-4">
                    RSVP Required
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Hi {guest.full_name}! You need to RSVP and confirm your attendance before generating your pass.
                  </p>
                  <div className="flex flex-col gap-3">
                    <a
                      href="/rsvp"
                      className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl text-sm uppercase tracking-wider font-sans transition-colors"
                    >
                      RSVP Now
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <Button
                      onClick={handleStartOver}
                      variant="outline"
                      className="rounded-xl border-border/50"
                    >
                      Back
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Pass Display */}
          {step === "display" && guest && passId && (
            <div className="animate-fade-in">
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-secondary to-primary" />

                <div className="text-center mb-6">
                  <p className="text-primary font-sans uppercase tracking-widest text-xs mb-2">
                    Wedding Pass
                  </p>
                  <h3 className="font-serif text-3xl text-foreground italic">
                    Tosin & Pelumi
                  </h3>
                </div>

                <div className="flex justify-center mb-8">
                  <div className="p-4 bg-white rounded-2xl">
                    <QRCodeSVG
                      id="wedding-qr-code"
                      value={generateQRValue()}
                      size={180}
                      level="H"
                      includeMargin={false}
                      fgColor="#0a0a14"
                      bgColor="#ffffff"
                    />
                  </div>
                </div>

                <div className="text-center mb-8 pb-8 border-b border-border/30">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wider">Guest</span>
                  </div>
                  <p className="font-serif text-2xl text-foreground">{guest.full_name}</p>
                </div>

                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-sans">December 12, 2026 | 10:00 AM</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-sans">Lambs Event Centre, Abeokuta</span>
                  </div>
                </div>

                <p className="text-center text-muted-foreground text-[10px] mt-6 font-mono">
                  Pass ID: {passId.substring(0, 8)}
                </p>

                <p className="text-center text-muted-foreground text-xs mt-4 font-sans">
                  Present this QR code at the venue entrance
                </p>
              </div>

              <div className="flex gap-4 mt-6">
                <Button
                  onClick={downloadPass}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Pass
                </Button>
                <Button
                  onClick={handleStartOver}
                  variant="outline"
                  className="py-6 rounded-xl border-border/50"
                >
                  New Pass
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QRCodePass;
