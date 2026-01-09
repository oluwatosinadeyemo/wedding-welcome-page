import heroImage from "@/assets/hero-wedding.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Elegant wedding florals"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <p className="wedding-subheading animate-fade-in-delay-1 mb-6">
          We're Getting Married
        </p>
        
        <h1 className="wedding-heading text-5xl md:text-7xl lg:text-8xl mb-4 animate-fade-in">
          Emma <span className="font-light italic">&</span> James
        </h1>
        
        <div className="wedding-divider my-8 animate-fade-in-delay-2" />
        
        <p className="wedding-subheading animate-fade-in-delay-3 text-base md:text-lg">
          September 21, 2025
        </p>
        
        <p className="text-muted-foreground mt-4 animate-fade-in-delay-3 font-sans text-sm md:text-base">
          Rosewood Estate, Napa Valley
        </p>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-px h-16 bg-gradient-to-b from-primary/50 to-transparent" />
      </div>
    </section>
  );
};

export default Hero;
