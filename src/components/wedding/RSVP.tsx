import { Button } from "@/components/ui/button";
import { Heart, Mail } from "lucide-react";

const RSVP = () => {
  return (
    <section className="wedding-section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="mb-12">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-secondary/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-secondary fill-secondary/20" />
          </div>
          <p className="wedding-subheading mb-4 text-primary">We Hope You Can Join Us</p>
          <h2 className="wedding-heading text-5xl md:text-7xl mb-6">
            Kindly Respond
          </h2>
          <div className="wedding-divider mb-8 w-32" />
        </div>

        <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg font-sans leading-relaxed">
          Please let us know if you'll be able to celebrate with us. 
          Kindly respond by October 1st, 2026.
        </p>

        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-7 text-base font-sans tracking-wider uppercase rounded-full glow"
        >
          RSVP Now
        </Button>

        <div className="mt-12 glass-card inline-block px-8 py-4 rounded-full">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="w-5 h-5 text-primary" />
            <span className="font-sans">Questions?</span>
            <a href="mailto:tosin.pelumi.wedding@email.com" className="text-primary hover:underline">
              tosin.pelumi.wedding@email.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RSVP;
