import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const RSVP = () => {
  return (
    <section className="wedding-section bg-gradient-to-b from-hydrangea-light/30 to-lavender-light/30">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <Heart className="w-8 h-8 text-lavender mx-auto mb-6 fill-lavender/20" />
          <p className="wedding-subheading mb-4">We Hope You Can Join Us</p>
          <h2 className="wedding-heading text-4xl md:text-5xl mb-6">
            Kindly Respond
          </h2>
          <div className="wedding-divider mb-8" />
        </div>

        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Please let us know if you'll be able to celebrate with us. 
          Kindly respond by October 1st, 2026.
        </p>

        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-base font-sans tracking-wider uppercase"
        >
          RSVP Now
        </Button>

        <p className="text-muted-foreground text-sm mt-8">
          Questions? Contact us at{" "}
          <a href="mailto:tosin.pelumi.wedding@email.com" className="text-primary hover:underline">
            tosin.pelumi.wedding@email.com
          </a>
        </p>
      </div>
    </section>
  );
};

export default RSVP;
