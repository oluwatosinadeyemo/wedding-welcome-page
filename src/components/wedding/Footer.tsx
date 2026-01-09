import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 px-6 bg-card border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="wedding-heading text-2xl md:text-3xl mb-4">
          Emma & James
        </h3>
        <p className="wedding-subheading text-xs mb-6">September 21, 2025</p>
        
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-rose fill-rose/50" />
          <span>for our special day</span>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border/50">
          <p className="text-muted-foreground text-xs">
            #EmmaAndJames2025
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
