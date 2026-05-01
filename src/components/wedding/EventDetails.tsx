import { MapPin, Clock, CalendarDays, Sparkles } from "lucide-react";
import venueImage from "@/assets/venue.jpg";

const EventDetails = () => {
  const events = [
    {
      title: "Traditional Wedding",
      time: "10:00 AM",
      location: "Main Hall",
      description: "Celebrate with us as we honour our cultural heritage",
      icon: "🎊",
    },
    {
      title: "Reception",
      time: "12:00 PM",
      location: "Main Hall",
      description: "Dinner, dancing, and celebration into the night",
      icon: "🎉",
    },
  ];

  return (
    <section className="wedding-section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-background to-card/50" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <p className="wedding-subheading mb-4 text-primary">Join Us</p>
          <h2 className="wedding-heading text-3xl sm:text-5xl md:text-7xl">Wedding Day</h2>
          <div className="wedding-divider mt-8 w-32" />
        </div>

        {/* Venue Image */}
        <div className="mb-20 relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-xl opacity-50" />
          <img
            src={venueImage}
            alt="Lambs Event Centre venue"
            className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] object-cover rounded-3xl shadow-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-3xl" />
          
          {/* Venue Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8">
            <div className="glass-card p-4 sm:p-6 md:p-8 inline-block">
              <div className="flex items-center gap-2 sm:gap-3 text-foreground mb-2">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span className="font-serif text-sm sm:text-xl md:text-2xl">Saturday, December 12, 2026</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span className="font-sans text-xs sm:text-base">Lambs Event Centre, Abeokuta, Ogun State, Nigeria</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {events.map((event, index) => (
            <div
              key={event.title}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative glass-card p-8 text-center hover:border-primary/30 transition-all duration-300">
                <div className="text-5xl mb-6">{event.icon}</div>
                <div className="flex items-center justify-center gap-2 text-primary mb-4">
                  <Clock className="w-4 h-4" />
                  <span className="wedding-subheading text-xs">{event.time}</span>
                </div>
                <h3 className="wedding-heading text-2xl mb-2">{event.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 font-sans">{event.location}</p>
                <div className="wedding-divider mb-6 w-16" />
                <p className="text-muted-foreground text-sm font-sans">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
