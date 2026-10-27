import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import DigitalAccessCard from "@/components/wedding/DigitalAccessCard";
import { Ticket, User, Loader2, ArrowRight, Home } from "lucide-react";
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
  const [searchParams] = useSearchParams();
  const [guestName, setGuestName] = useState("");
  const [guest, setGuest] = useState<GuestPassData | null>(null);
  const [passId, setPassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const autoLookupDoneRef = useRef(false);

  const [step, setStep] = useState<"lookup" | "generate" | "display">("lookup");
  const navigate = useNavigate();
  const location = useLocation();
  const isStandalonePage = location.pathname === "/pass";

  const validateGuestName = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("Please enter your name");
    if (trimmed.length > 100) throw new Error("Name must be 100 characters or less");
    if (!/^[\p{L}\p{M}\s’'\-]+$/u.test(trimmed))
      throw new Error("Name can only contain letters, spaces, hyphens, and apostrophes");
    return trimmed;
  };

  const handleLookup = async (overrideName?: string) => {
    const nameToLookup = overrideName ?? guestName;
    let validName: string;
    try {
      validName = validateGuestName(nameToLookup);
    } catch (err: any) {
      setError(err.message);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)(
        "lookup_guest_by_name",
        { guest_name: validName }
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
        const { data: passData } = await (supabase.rpc as any)(
          "get_guest_pass_id",
          { p_guest_id: result.id }
        );

        if (passData) {
          setPassId(passData as string);
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

  useEffect(() => {
    if (autoLookupDoneRef.current) return;
    const nameFromQuery = searchParams.get("name");
    const nameFromStorage = typeof window !== "undefined"
      ? localStorage.getItem("wedding_guest_name")
      : null;
    const prefilled = (nameFromQuery || nameFromStorage || "").trim();
    if (!prefilled) return;
    autoLookupDoneRef.current = true;
    setGuestName(prefilled);
    handleLookup(prefilled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
            Digital Access Card
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            Your personal invitation to celebrate with Tosin & Pelumi.
          </p>
          <p className="text-primary font-sans text-sm max-w-2xl mx-auto mt-4">
            Please note: each access card admits one person only.
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
                  onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                  maxLength={100}
                  className="bg-background/50 border-border/50 rounded-xl text-center text-lg py-6"
                />
                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}
                <Button
                  onClick={() => handleLookup()}
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
                    {guest.rsvp_attending === "maybe"
                      ? "Please Confirm Attendance"
                      : "RSVP Required"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {guest.rsvp_attending === "maybe"
                      ? `Hi ${guest.full_name}! You currently RSVP'd as "Not Sure Yet". Please update your RSVP to "Joyfully Accept" to receive your digital pass.`
                      : guest.rsvp_attending === "no"
                      ? `Hi ${guest.full_name}, you've declined the invitation. If your plans have changed, please update your RSVP to receive a pass.`
                      : `Hi ${guest.full_name}! You need to RSVP and confirm your attendance before generating your pass.`}
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
              <DigitalAccessCard guestName={guest.full_name} passId={passId} qrValue={generateQRValue()} />
              <Button
                onClick={handleStartOver}
                variant="outline"
                className="w-full mt-3 py-6 rounded-xl border-border/50"
              >
                New Pass
              </Button>

              {isStandalonePage && (
                <Button
                  onClick={() => {
                    sessionStorage.setItem("wedding_stage", "details");
                    navigate("/");
                  }}
                  variant="outline"
                  className="w-full mt-3 py-6 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  View Wedding Details
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QRCodePass;
