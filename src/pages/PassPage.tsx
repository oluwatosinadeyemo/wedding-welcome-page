import { Link } from "react-router-dom";
import QRCodePass from "@/components/wedding/QRCodePass";

const PassPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-8">
        <Link
          to="/"
          className="inline-block text-primary hover:text-primary/80 transition-colors"
        >
          <span className="wedding-heading text-2xl">T & P</span>
        </Link>
      </div>
      <QRCodePass />
      <div className="text-center pb-12">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground text-sm font-sans transition-colors"
        >
          Back to Wedding Site
        </Link>
      </div>
    </div>
  );
};

export default PassPage;
