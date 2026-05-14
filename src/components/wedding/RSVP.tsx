import { Heart, MessageCircle } from "lucide-react";
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
          <a
            href="https://wa.me/2348118079253"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card px-6 py-4 rounded-2xl flex items-center gap-3 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 text-green-600">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Bayo</p>
              <p className="text-green-600 font-sans text-sm">WhatsApp</p>
            </div>
          </a>
          <a
            href="https://wa.me/2347065582596"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card px-6 py-4 rounded-2xl flex items-center gap-3 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 text-green-600">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Deji</p>
              <p className="text-green-600 font-sans text-sm">WhatsApp</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default RSVP;
