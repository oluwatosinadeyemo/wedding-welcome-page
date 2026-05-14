import { useNavigate } from "react-router-dom";
import QRCodePass from "@/components/wedding/QRCodePass";

const PassPage = () => {
  const navigate = useNavigate();

  const goHome = () => {
    sessionStorage.setItem("wedding_stage", "details");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-8">
        <button
          onClick={goHome}
          className="inline-block text-primary hover:text-primary/80 transition-colors"
        >
          <span className="wedding-heading text-2xl">T & P</span>
        </button>
      </div>
      <QRCodePass />
      <div className="text-center pb-12">
        <button
          onClick={goHome}
          className="text-muted-foreground hover:text-foreground text-sm font-sans transition-colors"
        >
          Back to Wedding Site
        </button>
      </div>
    </div>
  );
};

export default PassPage;
