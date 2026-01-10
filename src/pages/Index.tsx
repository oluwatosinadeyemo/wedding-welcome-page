import Navigation from "@/components/wedding/Navigation";
import Hero from "@/components/wedding/Hero";
import Countdown from "@/components/wedding/Countdown";
import OurStory from "@/components/wedding/OurStory";
import EventDetails from "@/components/wedding/EventDetails";
import RSVP from "@/components/wedding/RSVP";
import Footer from "@/components/wedding/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main>
        <div id="home">
          <Hero />
        </div>

        <Countdown />
        
        <div id="our-story">
          <OurStory />
        </div>
        
        <div id="details">
          <EventDetails />
        </div>
        
        <div id="rsvp">
          <RSVP />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
