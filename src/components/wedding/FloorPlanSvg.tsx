import { Chair, HallConfig, Slot, VIEW_H, VIEW_W, WALKWAY, WING_LABEL } from "@/lib/hall-layout";

export interface FloorPlanColors {
  bg: string; ink: string; muted: string; rule: string;
  table: string; chair: string; feature: string; vip: string;
  highlight: string; red: string; green: string;
}

interface Props {
  config: HallConfig; // kept so callers pass the layout the slots came from
  slots: Slot[];
  colors: FloorPlanColors;
  serif: string;
  sans: string;
  highlightId?: string | null;
  dimmedIds?: Set<string>;
  occupancy?: Record<string, number>;
  onSelect?: (slot: Slot) => void;
}

// Rendered live in the dashboard and serialised to an image for access cards.
export default function FloorPlanSvg({ slots, colors, serif, sans, highlightId, dimmedIds, occupancy, onSelect }: Props) {
  const box = (x: number, y: number, w: number, h: number, text: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={colors.feature} stroke={colors.rule} />
      <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" fontFamily={serif} fontSize={24} fill={colors.ink}>{text}</text>
    </g>
  );
  const arrowY = 1120;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={VIEW_W} height={VIEW_H} role="img" aria-label="Reception hall floor plan">
      <rect width={VIEW_W} height={VIEW_H} fill={colors.bg} />
      {box(390, 40, 220, 60, "Couple's Seat")}
      {box(110, 150, 160, 54, "DJ")}
      {box(380, 140, 240, 72, "Dance Floor")}
      {box(730, 150, 160, 54, "Band")}
      <line x1={WALKWAY.x1} y1={WALKWAY.y1} x2={WALKWAY.x1} y2={WALKWAY.y2} stroke={colors.ink} strokeWidth={3} />
      <line x1={WALKWAY.x2} y1={WALKWAY.y1} x2={WALKWAY.x2} y2={WALKWAY.y2} stroke={colors.ink} strokeWidth={3} />
      <text x={500} y={820} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={30} fill={colors.ink} transform="rotate(-90 500 820)" letterSpacing={4}>WALK WAY</text>

      {slots.map(s => {
        const active = s.id === highlightId;
        const fill = active ? colors.highlight : s.kind === "vip" ? colors.vip : colors.table;
        const seated = occupancy?.[s.label.trim().toLowerCase()] ?? 0;
        // Chair size follows the table so round and VIP tables read at the same scale.
        const cw = s.kind === "vip" ? 22 : Math.max(9, s.r * 0.5);
        const ch = cw * 0.85;
        const chair = (c: Chair, i: number) => {
          const taken = i < seated;
          const body = active ? colors.highlight : taken ? colors.ink : colors.chair;
          // Rotate so the backrest sits on the side away from the table.
          const deg = (c.a * 180) / Math.PI - 90;
          return (
            <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${deg})`}>
              <rect x={-cw / 2} y={-ch / 2} width={cw} height={ch} rx={cw * 0.22} fill={body} stroke={colors.rule} strokeWidth={1} />
              <rect x={-cw / 2 - 1} y={ch / 2 - ch * 0.12} width={cw + 2} height={ch * 0.34} rx={ch * 0.17} fill={taken && !active ? colors.ink : colors.rule} />
            </g>
          );
        };
        const numbered = /^table\s+(\d+)$/i.exec(s.label.trim());
        const short = s.label.length > 9 ? s.label.slice(0, 8) + "…" : s.label;
        return (
          <g key={s.id} opacity={dimmedIds?.has(s.id) ? 0.2 : 1} onClick={onSelect ? () => onSelect(s) : undefined} style={onSelect ? { cursor: "pointer" } : undefined}>
            <title>{s.label}</title>
            {s.chairs.map(chair)}
            {s.kind === "round" ? (
              <>
                <circle cx={s.x} cy={s.y} r={s.r} fill={fill} stroke={active ? colors.ink : colors.rule} strokeWidth={active ? 4 : 1.5} />
                <circle cx={s.x} cy={s.y} r={s.r * 0.8} fill="none" stroke={colors.rule} strokeWidth={0.75} />
              </>
            ) : (
              <rect x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={6} fill={fill} stroke={active ? colors.ink : colors.rule} strokeWidth={active ? 4 : 1.5} />
            )}
            {s.kind === "round" && numbered ? (
              <>
                <text x={s.x} y={s.y - s.r * 0.22} textAnchor="middle" fontFamily={sans} fontWeight={600} fontSize={Math.max(6, s.r * 0.26)} letterSpacing={0.5} fill={colors.muted}>TABLE</text>
                <text x={s.x} y={s.y + s.r * 0.42} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={s.r * 0.72} fill={colors.ink}>{numbered[1]}</text>
              </>
            ) : s.kind === "round" ? (
              <text x={s.x} y={s.y + s.r * 0.16} textAnchor="middle" fontFamily={sans} fontWeight={600} fontSize={Math.max(10, s.r * (short.length > 4 ? 0.34 : 0.5))} fill={colors.ink}>{short}</text>
            ) : (
              <text x={s.x} y={s.y} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={18} fill={colors.ink} transform={`rotate(90 ${s.x} ${s.y})`} dy={6}>{s.label}</text>
            )}
          </g>
        );
      })}

      {/* Entrance with red (left) and green (right) direction arrows */}
      <line x1={60} y1={1085} x2={WALKWAY.x1 - 10} y2={1085} stroke={colors.ink} strokeWidth={2} />
      <line x1={WALKWAY.x2 + 10} y1={1085} x2={940} y2={1085} stroke={colors.ink} strokeWidth={2} />
      <rect x={WALKWAY.x1 - 20} y={1100} width={110} height={14} fill={colors.red} />
      <rect x={WALKWAY.x1 - 20} y={1128} width={110} height={14} fill={colors.red} />
      <polygon points={`420,${arrowY - 22} 140,${arrowY - 22} 140,${arrowY - 44} 70,${arrowY} 140,${arrowY + 44} 140,${arrowY + 22} 420,${arrowY + 22}`} fill={colors.red} />
      <polygon points={`580,${arrowY - 22} 860,${arrowY - 22} 860,${arrowY - 44} 930,${arrowY} 860,${arrowY + 44} 860,${arrowY + 22} 580,${arrowY + 22}`} fill={colors.green} />
      <text x={280} y={arrowY + 7} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={20} fill={colors.bg}>{WING_LABEL.left}</text>
      <text x={720} y={arrowY + 7} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={20} fill={colors.bg}>{WING_LABEL.right}</text>
      <text x={500} y={1215} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={36} fill={colors.ink}>Grand Entrance</text>
    </svg>
  );
}

export function readFloorPlanTheme() {
  const t = getComputedStyle(document.documentElement);
  const c = (n: string) => `hsl(${t.getPropertyValue(n).trim()})`;
  return {
    serif: t.getPropertyValue("--font-serif").trim(),
    sans: t.getPropertyValue("--font-sans").trim(),
    colors: {
      bg: c("--access-paper"), ink: c("--access-ink"), muted: c("--access-muted"), rule: c("--access-rule"),
      table: c("--plan-table"), chair: c("--plan-chair"), feature: c("--plan-feature"), vip: c("--plan-vip"),
      highlight: c("--plan-highlight"), red: c("--plan-red"), green: c("--plan-green"),
    } as FloorPlanColors,
  };
}
