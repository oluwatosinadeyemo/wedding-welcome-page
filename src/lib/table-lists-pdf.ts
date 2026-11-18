import { jsPDF } from "jspdf";

export interface TableListGuest { full_name: string; party_size: number }

// Builds a printable PDF: one page per table, logo header, bold table name, guest names.
export function buildTableListsPdf(
  tables: { name: string; guests: TableListGuest[] }[],
  logoDataUrl: string | null
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  tables.forEach((table, i) => {
    if (i > 0) doc.addPage();
    doc.setFillColor(16, 24, 48);
    doc.rect(0, 0, W, 62, "F");
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", W / 2 - 18, 6, 36, 36);
    doc.setTextColor(220, 226, 240);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text("TOSIN & PELUMI  ·  12 DECEMBER 2026  ·  #T&P2026", W / 2, 52, { align: "center" });

    doc.setTextColor(16, 16, 24);
    doc.setFont("times", "bold");
    doc.setFontSize(34);
    doc.text(table.name, W / 2, 84, { align: "center" });
    doc.setDrawColor(16, 24, 48);
    doc.setLineWidth(0.6);
    doc.line(60, 90, 150, 90);

    let y = 104;
    doc.setFontSize(16);
    table.guests.forEach((g, n) => {
      if (y > 270) { doc.addPage(); y = 25; }
      doc.setFont("times", "normal");
      doc.setTextColor(16, 16, 24);
      doc.text(`${n + 1}.  ${g.full_name}`, 30, y);
      if (g.party_size > 1) {
        doc.setFontSize(11);
        doc.setTextColor(110, 110, 125);
        const extra = g.party_size - 1;
        doc.text(`+${extra} guest${extra !== 1 ? "s" : ""}`, 180, y, { align: "right" });
        doc.setFontSize(16);
      }
      doc.setDrawColor(225, 225, 232);
      doc.setLineWidth(0.2);
      doc.line(30, y + 3.5, 180, y + 3.5);
      y += 11;
    });
    const seats = table.guests.reduce((s, g) => s + Math.max(1, g.party_size), 0);
    doc.setFontSize(11);
    doc.setTextColor(110, 110, 125);
    doc.text(`${table.guests.length} guest${table.guests.length !== 1 ? "s" : ""}  ·  ${seats} seats`, W / 2, 287, { align: "center" });
  });
  return doc.output("blob");
}
