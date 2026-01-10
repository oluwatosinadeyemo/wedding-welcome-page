import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Ticket, User, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QRCodePass = () => {
  const [guestName, setGuestName] = useState("");
  const [passGenerated, setPassGenerated] = useState(false);

  const weddingDetails = {
    couple: "Tosin & Pelumi",
    date: "December 12, 2026",
    venue: "Lambs Event Centre, Abeokuta",
    time: "4:00 PM",
  };

  const generateQRValue = () => {
    return JSON.stringify({
      event: "Tosin & Pelumi Wedding",
      guest: guestName || "Guest",
      date: weddingDetails.date,
      venue: weddingDetails.venue,
      id: `TP2026-${Date.now().toString(36).toUpperCase()}`,
    });
  };

  const handleGeneratePass = () => {
    if (!guestName.trim()) return;
    setPassGenerated(true);
  };

  const downloadPass = () => {
    const svg = document.getElementById("wedding-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 600;
      
      if (ctx) {
        // Background
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
        gradient.addColorStop(1, "rgba(168, 85, 247, 0.1)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px 'Playfair Display', serif";
        ctx.textAlign = "center";
        ctx.fillText("Wedding Pass", canvas.width / 2, 50);

        // Couple names
        ctx.font = "italic 32px 'Playfair Display', serif";
        ctx.fillText("Tosin & Pelumi", canvas.width / 2, 100);

        // QR Code
        ctx.drawImage(img, (canvas.width - 200) / 2, 130, 200, 200);

        // Guest name
        ctx.font = "18px Inter, sans-serif";
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText("Guest", canvas.width / 2, 370);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Inter, sans-serif";
        ctx.fillText(guestName, canvas.width / 2, 400);

        // Details
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "14px Inter, sans-serif";
        ctx.fillText("📅 December 12, 2026 • 4:00 PM", canvas.width / 2, 460);
        ctx.fillText("📍 Lambs Event Centre, Abeokuta", canvas.width / 2, 490);

        // Footer
        ctx.font = "12px Inter, sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("Present this pass at the venue entrance", canvas.width / 2, 560);
      }

      const link = document.createElement("a");
      link.download = `wedding-pass-${guestName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <section id="pass" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary font-sans uppercase tracking-[0.2em] text-sm mb-4 font-medium">
            Your Invitation
          </p>
          <h2 className="font-serif text-5xl md:text-7xl text-foreground mb-4 font-medium">
            Digital Pass
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            Generate your personalized wedding pass. Show the QR code at the venue entrance for seamless check-in.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          {!passGenerated ? (
            <div className="glass-card p-8 animate-fade-in">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
                <Ticket className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif text-2xl text-foreground mb-6 text-center">
                Generate Your Pass
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Your Full Name
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="bg-background/50 border-border/50 rounded-xl text-center text-lg py-6"
                  />
                </div>
                <Button
                  onClick={handleGeneratePass}
                  disabled={!guestName.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
                >
                  Generate Pass
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="glass-card p-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
                
                <div className="text-center mb-6">
                  <p className="text-primary font-sans uppercase tracking-widest text-xs mb-2">
                    Wedding Pass
                  </p>
                  <h3 className="font-serif text-3xl text-foreground italic">
                    Tosin & Pelumi
                  </h3>
                </div>

                {/* QR Code */}
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

                {/* Guest Info */}
                <div className="text-center mb-8 pb-8 border-b border-border/30">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-wider">Guest</span>
                  </div>
                  <p className="font-serif text-2xl text-foreground">{guestName}</p>
                </div>

                {/* Event Details */}
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-sans">December 12, 2026 • 4:00 PM</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-sans">Lambs Event Centre, Abeokuta</span>
                  </div>
                </div>

                {/* Instructions */}
                <p className="text-center text-muted-foreground text-xs mt-8 font-sans">
                  Present this QR code at the venue entrance
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-6">
                <Button
                  onClick={downloadPass}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Pass
                </Button>
                <Button
                  onClick={() => {
                    setPassGenerated(false);
                    setGuestName("");
                  }}
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
