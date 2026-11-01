import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deliverFile } from "@/lib/download-file";
import tpLogo from "@/assets/tp-logo.png";

interface DigitalTableCardProps {
  guestName: string;
  tableName: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the table card artwork."));
    image.src = src;
  });
}

// Wrap text within a max width, shrinking the font until it fits on at most maxLines lines.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  maxLines: number
): { lines: string[]; fontSize: number } {
  let lines: string[] = [];
  let fontSize = startSize;
  for (; fontSize >= minSize; fontSize -= 2) {
    ctx.font = `500 ${fontSize}px ${fontFamily}`;
    lines = [];
    let line = "";
    for (const character of text) {
      if (ctx.measureText(line + character).width > maxWidth && line) {
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
    if (lines.length <= maxLines) break;
  }
  return { lines, fontSize };
}

export default function DigitalTableCard({ guestName, tableName }: DigitalTableCardProps) {
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
        const logo = await loadImage(tpLogo);
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
        ctx.fillText("TABLE CARD", 450, 435);
        ctx.beginPath();
        ctx.moveTo(270, 485);
        ctx.lineTo(630, 485);
        ctx.stroke();

        // Guest name, centred in its own band.
        ctx.font = `20px ${sans}`;
        ctx.fillStyle = color("--access-muted");
        ctx.fillText("OUR WEDDING GUEST", 450, 560);
        ctx.fillStyle = color("--access-ink");
        const guest = wrapText(ctx, guestName, serif, 730, 46, 24, 3);
        const guestLineHeight = guest.fontSize + 12;
        const guestCentre = 660;
        const guestFirstBaseline = guestCentre - (guest.lines.length * guestLineHeight) / 2 + guest.fontSize * 0.78;
        guest.lines.forEach((line, index) => ctx.fillText(line, 450, guestFirstBaseline + index * guestLineHeight));

        // Table name, centred in its own band.
        ctx.font = `20px ${sans}`;
        ctx.fillStyle = color("--access-muted");
        ctx.fillText("YOUR TABLE", 450, 800);
        ctx.fillStyle = color("--access-ink");
        const table = wrapText(ctx, tableName.toUpperCase(), serif, 730, 64, 28, 3);
        const tableLineHeight = table.fontSize + 14;
        const tableCentre = 950;
        const tableFirstBaseline = tableCentre - (table.lines.length * tableLineHeight) / 2 + table.fontSize * 0.78;
        table.lines.forEach((line, index) => ctx.fillText(line, 450, tableFirstBaseline + index * tableLineHeight));

        ctx.beginPath();
        ctx.moveTo(270, 1100);
        ctx.lineTo(630, 1100);
        ctx.stroke();

        ctx.font = `42px ${serif}`;
        ctx.fillText("OLUWAPELUMI", 450, 1180);
        ctx.font = `italic 32px ${serif}`;
        ctx.fillText("and", 450, 1230);
        ctx.font = `42px ${serif}`;
        ctx.fillText("OLUWATOSIN", 450, 1285);
        ctx.font = `34px ${serif}`;
        ctx.fillText("12 . 12 . 26", 450, 1355);
        ctx.font = `26px ${serif}`;
        ctx.fillText("#T&P2026", 450, 1420);

        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(result => (result ? resolve(result) : reject(new Error("Could not save card"))), "image/png")
        );
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
  }, [guestName, tableName, retry]);

  return (
    <div>
      <div className="access-card-preview">
        {card ? (
          <img
            src={card.url}
            alt={`Table card for ${guestName}. Seated at ${tableName}. December 12, 2026.`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground" role="status">
            {error ? (
              <>
                <p>Could not prepare your table card.</p>
                <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Try Again</Button>
              </>
            ) : (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <p>Preparing your table card…</p>
              </>
            )}
          </div>
        )}
      </div>
      <Button
        disabled={!card}
        onClick={() => {
          if (card) void deliverFile(card.blob, `wedding-table-card-${guestName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`);
        }}
        className="w-full mt-6 py-6"
      >
        <Download className="w-5 h-5 mr-2" />Download Table Card
      </Button>
    </div>
  );
}
