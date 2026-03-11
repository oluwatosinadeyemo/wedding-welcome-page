import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import RSVPForm from "@/components/wedding/RSVPForm";

const RSVPPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
      <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            to="/"
            className="inline-block mb-8 text-primary hover:text-primary/80 transition-colors"
          >
            <span className="wedding-heading text-2xl">T & P</span>
          </Link>

          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-secondary/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-secondary fill-secondary/20" />
          </div>
          <p className="wedding-subheading mb-4 text-primary">We Hope You Can Join Us</p>
          <h1 className="wedding-heading text-3xl sm:text-5xl md:text-7xl mb-6">
            Kindly Respond
          </h1>
          <div className="wedding-divider mb-8 w-32" />
          <p className="text-muted-foreground max-w-lg mx-auto text-base sm:text-lg font-sans leading-relaxed">
            Please let us know if you'll be able to celebrate with us.
            Kindly respond by October 1st, 2026.
          </p>
        </div>

        {/* RSVP Form */}
        <RSVPForm />

        {/* Footer */}
        <div className="text-center mt-16">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground text-sm font-sans transition-colors"
          >
            Back to Wedding Site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RSVPPage;
