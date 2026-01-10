import { MapPin, Clock, CalendarDays } from "lucide-react";
import venueImage from "@/assets/venue.jpg";

const EventDetails = () => {
  const events = [
    {
      title: "Ceremony",
      time: "4:00 PM",
      location: "The Rose Garden",
      description: "Join us as we exchange our vows under the floral arch",
    },
    {
      title: "Cocktail Hour",
      time: "5:00 PM",
      location: "The Terrace",
      description: "Drinks and hors d'oeuvres with stunning vineyard views",
    },
    {
      title: "Reception",
      time: "6:30 PM",
      location: "The Grand Ballroom",
      description: "Dinner, dancing, and celebration into the evening",
    },
  ];

  return (
    <section className="wedding-section">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="wedding-subheading mb-4">Join Us</p>
          <h2 className="wedding-heading text-4xl md:text-5xl">Wedding Day</h2>
          <div className="wedding-divider mt-6" />
        </div>

        {/* Venue Image */}
        <div className="mb-16 relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-sage-light via-champagne to-rose-light rounded-sm opacity-40" />
          <img
            src={venueImage}
            alt="Lambs Event Centre venue"
            className="relative w-full aspect-[21/9] object-cover rounded-sm shadow-lg"
          />
        </div>

        {/* Date and Location Banner */}
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-3 text-foreground">
            <CalendarDays className="w-5 h-5 text-primary" />
            <span className="font-serif text-xl">Saturday, December 12, 2026</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <MapPin className="w-5 h-5 text-primary" />
            <span>Lambs Event Centre, Abeokuta, Ogun State, Nigeria</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="grid md:grid-cols-3 gap-8">
          {events.map((event, index) => (
            <div
              key={event.title}
              className="wedding-card text-center group hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center justify-center gap-2 text-primary mb-4">
                <Clock className="w-4 h-4" />
                <span className="wedding-subheading text-xs">{event.time}</span>
              </div>
              <h3 className="wedding-heading text-2xl mb-2">{event.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{event.location}</p>
              <div className="wedding-divider mb-4 group-hover:w-32 transition-all duration-300" />
              <p className="text-muted-foreground text-sm">{event.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
