import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { downloadFloorPlan } from "@/lib/floor-plan-download";
import type { HallConfig, Slot } from "@/lib/hall-layout";

interface Props {
  config: HallConfig;
  slots: Slot[];
  occupancy?: Record<string, number>;
}

// Saves the whole floor plan as a PNG image or an A4 PDF.
export default function DownloadPlanButton({ config, slots, occupancy }: Props) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const save = async (format: "png" | "pdf") => {
    setBusy(true);
    try {
      await downloadFloorPlan({ config, slots, occupancy }, format);
    } catch (err: any) {
      toast({ title: "Could not download the floor plan", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-border/50" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Download Plan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => save("pdf")}>PDF (A4, for printing)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => save("png")}>Image (PNG)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
