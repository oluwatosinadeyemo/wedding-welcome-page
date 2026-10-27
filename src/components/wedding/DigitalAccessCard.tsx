import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deliverFile } from "@/lib/download-file";
import tpLogo from "@/assets/tp-logo.png";

interface DigitalAccessCardProps {
  guestName: string;
  passId: string;
  qrValue: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the access card artwork."));
    image.src = src;
  });
}

export default function DigitalAccessCard({ guestName, passId, qrValue }: DigitalAccessCardProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let previewUrl: string | undefined;
    setCard(null);
    setError(false);

    async function renderCard() {
      try {
        await document.fonts.ready;
        const svg = qrRef.current?.querySelector("svg");
        if (!svg) throw new Error("QR code unavailable");
        const qrBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
        const qrUrl = URL.createObjectURL(qrBlob);
        let qr: HTMLImageElement;
        let logo: HTMLImageElement;
        try {
          [qr, logo] = await Promise.all([loadImage(qrUrl), loadImage(tpLogo)]);
        } finally {
          URL.revokeObjectURL(qrUrl);
        }
        const canvas = document.createElement("canvas");
        canvas.width = 900;
        canvas.height = 1500;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Unable to prepare card");
        const tokens = getComputedStyle(document.documentElement);
        const color = (name: string) => `hsl(${tokens.getPropertyValue(name).trim()})`;
        const serif = tokens.getPropertyValue("--font-serif").trim();
        const sans = tokens.getPropertyValue("--font-sans").trim();
        ctx.fillStyle = color("--access-paper");
        ctx.fillRect(0, 0, 900, 1500);
        ctx.textAlign = "center";
        ctx.fillStyle = color("--access-ink");
        ctx.strokeStyle = color("--access-rule");
        ctx.lineWidth = 2;
        ctx.strokeRect(25, 25, 850, 1450);
        ctx.drawImage(logo, 290, 60, 320, 320);
        ctx.font = `48px ${serif}`;
        ctx.fillText("ACCESS CARD", 450, 435);
        ctx.beginPath();
        ctx.moveTo(270, 485);
        ctx.lineTo(630, 485);
        ctx.stroke();
        ctx.font = `26px ${serif}`;
        ctx.fillText("ADMITS ONE", 450, 530);

        // Wrap the saved RSVP name without truncating or substituting it.
        let lines: string[] = [];
        let fontSize = 46;
        for (; fontSize >= 24; fontSize -= 2) {
          ctx.font = `500 ${fontSize}px ${serif}`;
          lines = [];
          let line = "";
          for (const character of guestName) {
            if (ctx.measureText(line + character).width > 730 && line) {
              const space = line.lastIndexOf(" ");
              if (space > 0) {
                lines.push(line.slice(0, space));
                line = line.slice(space + 1) + character;
              } else {
                lines.push(line);
                line = character;
              }
            } else line += character;
          }
          if (line) lines.push(line);
          if (lines.length <= 3) break;
        }
        lines.forEach((line, index) => ctx.fillText(line, 450, 635 + index * (fontSize + 12)));
        ctx.font = `20px ${sans}`;
        ctx.fillStyle = color("--access-muted");
        ctx.fillText("OUR WEDDING GUEST", 450, 590);
        ctx.fillStyle = color("--access-ink");
        ctx.font = `42px ${serif}`;
        ctx.fillText("OLUWAPELUMI", 450, 845);
        ctx.font = `italic 32px ${serif}`;
        ctx.fillText("and", 450, 895);
        ctx.font = `42px ${serif}`;
        ctx.fillText("OLUWATOSIN", 450, 950);
        ctx.font = `34px ${serif}`;
        ctx.fillText("12 . 12 . 26", 450, 1020);
        ctx.font = `22px ${sans}`;
        ctx.fillText("10:00 AM  ·  The Lamb's Events", 450, 1070);
        ctx.drawImage(qr, 345, 1110, 210, 210);
        ctx.fillStyle = color("--access-muted");
        ctx.font = `18px ${sans}`;
        ctx.fillText(`Pass ID: ${passId.slice(0, 8)}`, 450, 1350);
        ctx.font = `26px ${serif}`;
        ctx.fillStyle = color("--access-ink");
        ctx.fillText("#T&P2026", 450, 1420);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Could not save card")), "image/png"));
        if (cancelled) return;
        previewUrl = URL.createObjectURL(blob);
        setCard({ blob, url: previewUrl });
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void renderCard();
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [guestName, passId, qrValue, retry]);

  return (
    <div>
      <div ref={qrRef} className="hidden" aria-hidden="true">
        <QRCodeSVG value={qrValue} size={300} level="H" marginSize={4} />
      </div>
      <div className="access-card-preview">
        {card ? (
          <img src={card.url} alt={`Digital access card for ${guestName}. Admits one. December 12, 2026 at 10:00 AM. Includes entry QR code.`} className="w-full h-full object-contain" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground" role="status">
            {error ? <><p>Could not prepare your access card.</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Try Again</Button></> : <><Loader2 className="w-6 h-6 animate-spin" /><p>Preparing your access card…</p></>}
          </div>
        )}
      </div>
      <Button disabled={!card} onClick={() => {
        if (card) void deliverFile(card.blob, `wedding-access-card-${guestName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`);
      }} className="w-full mt-6 py-6">
        <Download className="w-5 h-5 mr-2" />Download Access Card
      </Button>
    </div>
  );
}