import heroImage from "@/assets/hero-wedding.jpg";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Blue garden wedding"
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
      </div>

      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <p className="wedding-subheading animate-fade-in-delay-1 mb-8 text-primary">
          We're Getting Married
        </p>
        
        <h1 className="wedding-heading text-4xl sm:text-6xl md:text-8xl lg:text-9xl mb-6 animate-fade-in bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
          Tosin <span className="font-light italic">&</span> Pelumi
        </h1>
        
        <div className="wedding-divider my-10 animate-fade-in-delay-2 w-40" />
        
        <p className="animate-fade-in-delay-3 text-lg sm:text-xl md:text-2xl font-sans font-light text-foreground/90">
          December 12, 2026
        </p>
        
        <p className="text-muted-foreground mt-4 animate-fade-in-delay-3 font-sans text-base md:text-lg">
          Lambs Event Centre, Abeokuta, Nigeria
        </p>

        {/* Scroll CTA */}
        <div className="mt-16 animate-fade-in-delay-3">
          <button 
            onClick={() => document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-300 font-sans text-sm uppercase tracking-wider backdrop-blur-sm"
          >
            Explore Our Story
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-muted-foreground text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-px h-16 bg-gradient-to-b from-primary/50 to-transparent animate-pulse" />
      </div>
    </section>
  );
};

export default Hero;
