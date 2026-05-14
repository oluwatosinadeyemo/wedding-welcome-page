import { Heart, Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const RSVP = () => {
  return (
    <section id="rsvp" className="wedding-section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="mb-12">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-secondary/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-secondary fill-secondary/20" />
          </div>
          <p className="wedding-subheading mb-4 text-primary">We Hope You Can Join Us</p>
          <h2 className="wedding-heading text-3xl sm:text-5xl md:text-7xl mb-6">
            Kindly Respond
          </h2>
          <div className="wedding-divider mb-8 w-32" />
        </div>

        <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg font-sans leading-relaxed">
          Please let us know if you'll be able to celebrate with us.
          Kindly respond by May 30th, 2026.
        </p>

        <Link
          to="/rsvp"
          className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-7 text-base font-sans tracking-wider uppercase rounded-full glow transition-colors"
        >
          RSVP Now
        </Link>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Bayo</p>
              <a href="tel:+2348118079253" className="text-primary hover:underline font-sans text-sm">
                +234 811 807 9253
              </a>
            </div>
            <a
              href="https://wa.me/2348118079253"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
              aria-label="WhatsApp Bayo"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
          <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Deji</p>
              <a href="tel:+2347065582596" className="text-primary hover:underline font-sans text-sm">
                +234 706 558 2596
              </a>
            </div>
            <a
              href="https://wa.me/2347065582596"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
              aria-label="WhatsApp Deji"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RSVP;
