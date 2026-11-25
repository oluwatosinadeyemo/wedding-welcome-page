import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { jsPDF } from "jspdf";
import FloorPlanSvg, { readFloorPlanTheme } from "@/components/wedding/FloorPlanSvg";
import { HallConfig, Slot, VIEW_H, VIEW_W } from "./hall-layout";
import { deliverFile } from "./download-file";
import tpLogo from "@/assets/tp-logo.png";

// Same font request as index.css, so the saved plan uses the site's typefaces.
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap";

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not draw the floor plan."));
    image.src = src;
  });

// An SVG drawn as an image can't reach the page's web fonts, so the Latin font files are inlined.
let fontCss: Promise<string> | null = null;
function embeddedFontCss() {
  fontCss ??= (async () => {
    const css = await (await fetch(FONT_CSS_URL)).text();
    // The plan has no italic text; leaving the italic face out stops it being picked for normal text.
    const latin = css
      .split("/* ")
      .filter(block => block.startsWith("latin */") && !block.includes("font-style: italic"))
      .map(block => block.slice("latin */".length));
    const faces = await Promise.all(
      latin.map(async face => {
        const url = /url\((https:[^)]+)\)/.exec(face)?.[1];
        if (!url) return face;
        return face.replace(url, await toDataUrl(await (await fetch(url)).blob()));
      })
    );
    return faces.join("\n");
  })().catch(() => {
    fontCss = null;
    return "";
  });
  return fontCss;
}

interface PlanInput {
  config: HallConfig;
  slots: Slot[];
  occupancy?: Record<string, number>;
}

// Draws the full plan (no selection or filters) onto a canvas at print resolution.
async function renderPlan({ config, slots, occupancy }: PlanInput, scale = 2) {
  const theme = readFloorPlanTheme();
  let markup = renderToStaticMarkup(
    createElement(FloorPlanSvg, { config, slots, colors: theme.colors, serif: theme.serif, sans: theme.sans, occupancy })
  );
  const fonts = await embeddedFontCss();
  if (fonts) markup = markup.replace(/(<svg[^>]*>)/, `$1<style>${fonts}</style>`);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = VIEW_W * scale;
    canvas.height = VIEW_H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not draw the floor plan.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Could not save the floor plan."))), "image/png")
  );

export async function downloadFloorPlan(input: PlanInput, format: "png" | "pdf") {
  const canvas = await renderPlan(input);
  if (format === "png") {
    await deliverFile(await toPng(canvas), "tosin-pelumi-floor-plan.png");
    return;
  }

  // A4 page with the same header band as the printed table lists.
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210;
  doc.setFillColor(16, 24, 48);
  doc.rect(0, 0, W, 36, "F");
  const logo = await loadImage(tpLogo).catch(() => null);
  if (logo) {
    // A small copy is plenty for a 24 mm logo and keeps the file light.
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = Math.round(300 * (logo.naturalHeight / logo.naturalWidth));
    c.getContext("2d")?.drawImage(logo, 0, 0, c.width, c.height);
    doc.addImage(c.toDataURL("image/png"), "PNG", W / 2 - 12, 3, 24, 24);
  }
  doc.setTextColor(220, 226, 240);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("TOSIN & PELUMI  ·  12 DECEMBER 2026  ·  #T&P2026", W / 2, 32, { align: "center" });
  doc.setTextColor(16, 16, 24);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("Reception Floor Plan", W / 2, 46, { align: "center" });

  const top = 51;
  const maxH = 297 - top - 8;
  const maxW = W - 16;
  const h = Math.min(maxH, maxW * (VIEW_H / VIEW_W));
  const w = h * (VIEW_W / VIEW_H);
  doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (W - w) / 2, top, w, h);
  await deliverFile(doc.output("blob"), "tosin-pelumi-floor-plan.pdf");
}
