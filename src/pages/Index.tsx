import { useState } from "react";
import Envelope from "@/components/wedding/Envelope";
import RSVPForm from "@/components/wedding/RSVPForm";
import Navigation from "@/components/wedding/Navigation";
import Hero from "@/components/wedding/Hero";
import Countdown from "@/components/wedding/Countdown";
import OurStory from "@/components/wedding/OurStory";
import EventDetails from "@/components/wedding/EventDetails";
import TravelAccommodation from "@/components/wedding/TravelAccommodation";
import PhotoGallery from "@/components/wedding/PhotoGallery";
import QRCodePass from "@/components/wedding/QRCodePass";
import RSVP from "@/components/wedding/RSVP";
import Footer from "@/components/wedding/Footer";
import { Heart, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Stage = "envelope" | "rsvp" | "details";

const Index = () => {
  const [stage, setStage] = useState<Stage>("envelope");
  const [rsvpDone, setRsvpDone] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [skipCode, setSkipCode] = useState("");
  const [skipLoading, setSkipLoading] = useState(false);
  const { toast } = useToast();

  const handleSkipLookup = async () => {
    if (!skipCode.trim()) return;
    setSkipLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("lookup_guest_by_invite_code", {
        code: skipCode.trim(),
      });
      if (error) throw error;
      const guest = data?.[0];
      if (guest?.has_pass) {
        setStage("details");
      } else if (guest?.has_rsvp) {
        toast({ title: "Pass not generated yet", description: "You've RSVP'd but haven't generated your pass yet. Please proceed with the RSVP flow." });
      } else {
        toast({ title: "Not found", description: "No pass found for this invite code. Please RSVP first.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not verify your code. Please try again.", variant: "destructive" });
    } finally {
      setSkipLoading(false);
    }
  };

  if (stage === "envelope") {
    return <Envelope onOpen={() => setStage("rsvp")} />;
  }

  if (stage === "rsvp") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 py-12">
          {!rsvpDone ? (
            <>
              <div className="text-center mb-12">
                <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-secondary/10 flex items-center justify-center animate-fade-in">
                  <Heart className="w-10 h-10 text-secondary fill-secondary/20" />
                </div>
                <p className="wedding-subheading mb-4 text-primary animate-fade-in-delay-1">We Hope You Can Join Us</p>
                <h1 className="wedding-heading text-3xl sm:text-5xl md:text-7xl mb-6 animate-fade-in-delay-1">
                  Kindly Respond
                </h1>
                <div className="wedding-divider mb-8 w-32 animate-fade-in-delay-2" />
                <p className="text-muted-foreground max-w-lg mx-auto text-base sm:text-lg font-sans leading-relaxed animate-fade-in-delay-2">
                  Please let us know if you'll be attending before viewing the wedding details.
                </p>

                {!showSkip ? (
                  <button
                    onClick={() => setShowSkip(true)}
                    className="mt-4 text-sm text-muted-foreground/70 hover:text-primary underline underline-offset-4 transition-colors font-sans animate-fade-in-delay-3"
                  >
                    Already have your pass? Skip to details →
                  </button>
                ) : (
                  <div className="mt-6 max-w-sm mx-auto animate-fade-in">
                    <div className="glass-card p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                        <KeyRound className="w-4 h-4" />
                        Enter your invite code
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. TP-ADEOLA-001"
                          value={skipCode}
                          onChange={(e) => setSkipCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSkipLookup()}
                          className="text-sm"
                        />
                        <Button onClick={handleSkipLookup} disabled={skipLoading || !skipCode.trim()} size="sm">
                          {skipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
                        </Button>
                      </div>
                      <button
                        onClick={() => setShowSkip(false)}
                        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-sans"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="animate-fade-in-delay-3">
                <RSVPForm onSubmitSuccess={() => setRsvpDone(true)} />
              </div>
            </>
          ) : (
            <div className="max-w-lg mx-auto text-center animate-fade-in pt-20">
              <div className="glass-card p-8">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif text-3xl text-foreground mb-4">Thank You!</h3>
                <p className="text-muted-foreground mb-8 font-sans">
                  Your response has been recorded. You can now view all the wedding details.
                </p>
                <button
                  onClick={() => setStage("details")}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-sm font-sans tracking-wider uppercase rounded-full glow transition-colors"
                >
                  View Wedding Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main>
        <div id="home">
          <Hero />
        </div>

        <Countdown />
        
        <div id="our-story">
          <OurStory />
        </div>
        
        <div id="details">
          <EventDetails />
        </div>

        <TravelAccommodation />

        <div id="gallery">
          <PhotoGallery />
        </div>

        <div id="pass">
          <QRCodePass />
        </div>
        
        <div id="rsvp">
          <RSVP />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
