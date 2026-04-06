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
import { Heart } from "lucide-react";

type Stage = "envelope" | "rsvp" | "details";

const Index = () => {
  const [stage, setStage] = useState<Stage>("envelope");

  if (stage === "envelope") {
    return <Envelope onOpen={() => setStage("rsvp")} />;
  }

  if (stage === "rsvp") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 py-12">
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
              Please let us know if you'll be able to celebrate with us before viewing the wedding details.
            </p>
          </div>

          <div className="animate-fade-in-delay-3">
            <RSVPFormWithContinue onContinue={() => setStage("details")} />
          </div>
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

/** Wraps RSVPForm and adds a "Continue to Details" button after submission */
const RSVPFormWithContinue = ({ onContinue }: { onContinue: () => void }) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);

  return (
    <div>
      {!hasSubmitted ? (
        <RSVPFormInterceptor onSubmitted={() => setHasSubmitted(true)} />
      ) : (
        <div className="max-w-lg mx-auto text-center animate-fade-in">
          <div className="glass-card p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10">
              <Heart className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-serif text-3xl text-foreground mb-4">Thank You!</h3>
            <p className="text-muted-foreground mb-8 font-sans">
              Your response has been recorded. You can now view all the wedding details.
            </p>
            <button
              onClick={onContinue}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-sm font-sans tracking-wider uppercase rounded-full glow transition-colors"
            >
              View Wedding Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Renders RSVPForm but intercepts submission to notify parent */
import { useEffect, useRef } from "react";

const RSVPFormInterceptor = ({ onSubmitted }: { onSubmitted: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for the toast event that RSVPForm fires on success
    const observer = new MutationObserver(() => {
      const confirmation = containerRef.current?.querySelector('[class*="glass-card"]');
      if (confirmation) {
        // RSVPForm switched to confirmation view
        setTimeout(() => onSubmitted(), 2000);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [onSubmitted]);

  return (
    <div ref={containerRef}>
      <RSVPForm />
    </div>
  );
};

export default Index;
