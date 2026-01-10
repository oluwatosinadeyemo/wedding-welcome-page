import { Heart, Instagram, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-16 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-card/50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="mb-8">
          <h3 className="wedding-heading text-4xl md:text-5xl mb-2 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Tosin & Pelumi
          </h3>
          <p className="wedding-subheading text-xs text-primary mt-4">December 12, 2026</p>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-8">
          <span className="font-sans">Made with</span>
          <Heart className="w-4 h-4 text-secondary fill-secondary/50 animate-pulse" />
          <span className="font-sans">for our special day</span>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <a
            href="#"
            className="w-12 h-12 rounded-full bg-card/80 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
          >
            <Instagram className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="w-12 h-12 rounded-full bg-card/80 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
          >
            <Twitter className="w-5 h-5" />
          </a>
        </div>
        
        <div className="pt-8 border-t border-border/30">
          <p className="text-primary text-lg font-sans tracking-widest">
            #TosinAndPelumi2026
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
