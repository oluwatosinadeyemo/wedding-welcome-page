import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Heart, HeartCrack } from "lucide-react";

type Stage = "envelope" | "rsvp" | "details" | "declined";

const Index = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>(() => {
    const saved = sessionStorage.getItem("wedding_stage") as Stage | null;
    return saved ?? "envelope";
  });

  useEffect(() => {
    sessionStorage.setItem("wedding_stage", stage);
    if (stage === "details") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [stage]);

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
                Please let us know if you'll be attending.
              </p>

              <button
                onClick={() => setStage("details")}
                className="mt-4 text-sm text-muted-foreground/70 hover:text-primary underline underline-offset-4 transition-colors font-sans animate-fade-in-delay-3"
              >
                Already RSVP'd? Skip to details →
              </button>
            </div>

            <div className="animate-fade-in-delay-3">
              <RSVPForm onSubmitSuccess={(attending, fullName) => {
                if (attending === "no") {
                  setStage("declined");
                } else if (attending === "yes") {
                  navigate(`/pass?name=${encodeURIComponent(fullName)}`);
                } else {
                  setStage("details");
                }
              }} />
            </div>
          </>
        </div>
      </div>
    );
  }

  if (stage === "declined") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
        <div className="relative z-10 max-w-lg mx-auto text-center px-4">
          <div className="glass-card p-10">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-muted/20">
              <HeartCrack className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-3xl text-foreground mb-4">We'll Miss You!</h3>
            <p className="text-muted-foreground font-sans leading-relaxed mb-8">
              Thank you for letting us know. You'll be in our thoughts on our special day. 💕
            </p>
            <button
              onClick={() => setStage("details")}
              className="text-primary hover:text-primary/80 text-sm font-sans transition-colors underline underline-offset-4"
            >
              Browse the wedding details →
            </button>
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

export default Index;
