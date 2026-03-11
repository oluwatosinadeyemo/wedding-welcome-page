import { Heart, Mail } from "lucide-react";
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
          Kindly respond by October 1st, 2026.
        </p>

        <Link
          to="/rsvp"
          className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-7 text-base font-sans tracking-wider uppercase rounded-full glow transition-colors"
        >
          RSVP Now
        </Link>

        <div className="mt-12 glass-card inline-block px-4 sm:px-8 py-4 rounded-2xl sm:rounded-full">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <span className="font-sans">Questions?</span>
            </div>
            <a href="mailto:oluwatosinadeyemo50@gmail.com" className="text-primary hover:underline text-sm sm:text-base break-all sm:break-normal">
              oluwatosinadeyemo50@gmail.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RSVP;
