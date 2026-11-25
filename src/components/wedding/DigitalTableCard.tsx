import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deliverFile } from "@/lib/download-file";
import tpLogo from "@/assets/tp-logo.png";
import type { Tablemate } from "@/lib/hall-layout";

interface DigitalTableCardProps {
  guestName: string;
  tableName: string;
  tableWing?: string | null;
  tablemates?: Tablemate[];
}

const mateLabel = (m: Tablemate) => (m.party_size > 1 ? `${m.full_name} (+${m.party_size - 1})` : m.full_name);

// Shortens a single line with an ellipsis so long names never spill into the next column.
function fitLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + "…").width > maxWidth) cut = cut.slice(0, -1);
  return cut.trimEnd() + "…";
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

export default function DigitalTableCard({ guestName, tableName, tableWing, tablemates = [] }: DigitalTableCardProps) {
  // A stable key, so a fresh lookup with the same people doesn't redraw the card.
  const matesKey = JSON.stringify(tablemates);
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
        const mates: Tablemate[] = JSON.parse(matesKey);
        const ink = color("--access-ink");
        const muted = color("--access-muted");
        const rule = (y: number) => { ctx.beginPath(); ctx.moveTo(270, y); ctx.lineTo(630, y); ctx.stroke(); };

        ctx.drawImage(logo, 350, 55, 200, 200);
        ctx.font = `44px ${serif}`;
        ctx.fillText("TABLE CARD", 450, 310);
        rule(345);

        // Guest name, up to two lines.
        ctx.font = `20px ${sans}`;
        ctx.fillStyle = muted;
        ctx.fillText("OUR WEDDING GUEST", 450, 395);
        ctx.fillStyle = ink;
        const guest = wrapText(ctx, guestName, serif, 730, 42, 24, 2);
        const guestLineHeight = guest.fontSize + 10;
        guest.lines.forEach((line, index) => ctx.fillText(line, 450, 445 + index * guestLineHeight));

        // Table and wing.
        ctx.font = `20px ${sans}`;
        ctx.fillStyle = muted;
        ctx.fillText("YOUR TABLE", 450, 560);
        ctx.fillStyle = ink;
        const table = wrapText(ctx, tableName.toUpperCase(), serif, 730, 64, 32, 1);
        ctx.fillText(table.lines[0] ?? "", 450, 630);
        if (tableWing) {
          ctx.font = `600 24px ${sans}`;
          ctx.fillStyle = color(/right/i.test(tableWing) ? "--plan-green" : "--plan-red");
          ctx.fillText(tableWing.toUpperCase(), 450, 680);
          ctx.fillStyle = ink;
        }
        rule(720);

        // Everyone else at the table, in two columns.
        ctx.font = `20px ${sans}`;
        ctx.fillStyle = muted;
        ctx.fillText("SEATED WITH YOU", 450, 770);
        ctx.fillStyle = ink;
        if (mates.length === 0) {
          ctx.font = `italic 26px ${serif}`;
          ctx.fillText("Your tablemates will appear here soon.", 450, 830);
        } else {
          const perColumn = 8;
          const shown = mates.length > perColumn * 2 ? mates.slice(0, perColumn * 2 - 1) : mates;
          const extra = mates.length - shown.length;
          const items = shown.map(mateLabel).concat(extra > 0 ? [`and ${extra} more`] : []);
          const twoColumns = items.length > 5;
          const rows = twoColumns ? Math.ceil(items.length / 2) : items.length;
          ctx.font = `26px ${serif}`;
          items.forEach((label, i) => {
            const col = twoColumns ? Math.floor(i / rows) : 0;
            const row = twoColumns ? i % rows : i;
            const x = twoColumns ? (col === 0 ? 255 : 645) : 450;
            ctx.fillText(fitLine(ctx, label, twoColumns ? 360 : 730), x, 825 + row * 42);
          });
        }
        rule(1180);

        ctx.font = `36px ${serif}`;
        ctx.fillText("OLUWAPELUMI", 450, 1245);
        ctx.font = `italic 28px ${serif}`;
        ctx.fillText("and", 450, 1288);
        ctx.font = `36px ${serif}`;
        ctx.fillText("OLUWATOSIN", 450, 1335);
        ctx.font = `30px ${serif}`;
        ctx.fillText("12 . 12 . 26", 450, 1390);
        ctx.font = `24px ${serif}`;
        ctx.fillText("#T&P2026", 450, 1440);

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
  }, [guestName, tableName, tableWing, matesKey, retry]);

  return (
    <div>
      <div className="access-card-preview">
        {card ? (
          <img
            src={card.url}
            alt={`Table card for ${guestName}. Seated at ${tableName}${tableWing ? `, ${tableWing}` : ""}${tablemates.length ? ` with ${tablemates.map(mateLabel).join(", ")}` : ""}. December 12, 2026.`}
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
