import { MapPin, Car, Plane, Hotel, Phone, ExternalLink } from "lucide-react";

const TravelAccommodation = () => {
  const hotels = [
    {
      name: "Park Inn by Radisson",
      distance: "5 km from venue",
      description: "Modern luxury hotel with excellent amenities and conference facilities",
      phone: "+234 803 123 4567",
      website: "#",
      price: "₦₦₦",
    },
    {
      name: "Gateway Hotel",
      distance: "3 km from venue",
      description: "Comfortable accommodations with Nigerian hospitality",
      phone: "+234 803 234 5678",
      website: "#",
      price: "₦₦",
    },
    {
      name: "Premier Hotel Abeokuta",
      distance: "4 km from venue",
      description: "Family-friendly with spacious rooms and restaurant",
      phone: "+234 803 345 6789",
      website: "#",
      price: "₦₦",
    },
  ];

  const directions = [
    {
      icon: Plane,
      title: "By Air",
      description: "The nearest airport is Murtala Muhammed International Airport (LOS) in Lagos, approximately 80 km from Abeokuta. Domestic flights also available via other Nigerian airports.",
    },
    {
      icon: Car,
      title: "By Car",
      description: "From Lagos, take the Lagos-Abeokuta Expressway. The venue is located in the heart of Abeokuta. Ample parking available at the venue.",
    },
  ];

  return (
    <section id="travel" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <p className="text-sage font-sans uppercase tracking-[0.3em] text-sm mb-4">
            Plan Your Visit
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            Travel & Accommodation
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
            We've arranged special rates at nearby hotels for our guests. Please mention "Tosin & Pelumi Wedding" when booking.
          </p>
        </div>

        {/* Directions */}
        <div className="grid md:grid-cols-2 gap-6 mb-16 animate-fade-in-up">
          {directions.map((item, index) => (
            <div
              key={item.title}
              className="bg-ivory rounded-lg p-8 border border-champagne/30"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-sage" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="mb-16 animate-fade-in-up">
          <div className="bg-ivory rounded-lg p-4 border border-champagne/30">
            <div className="aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3955.123456789!2d3.3515!3d7.1475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sAbeokuta%2C%20Nigeria!5e0!3m2!1sen!2sng!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Wedding Venue Location"
                className="grayscale-[30%] contrast-[1.1]"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-sage">
              <MapPin className="w-4 h-4" />
              <span className="font-sans text-sm">
                Lambs Event Centre, Abeokuta, Ogun State, Nigeria
              </span>
            </div>
          </div>
        </div>

        {/* Hotels */}
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-champagne" />
            <Hotel className="w-5 h-5 text-gold" />
            <h3 className="font-serif text-2xl text-foreground">Recommended Hotels</h3>
            <Hotel className="w-5 h-5 text-gold" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-champagne" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {hotels.map((hotel, index) => (
              <div
                key={hotel.name}
                className="bg-ivory rounded-lg p-6 border border-champagne/30 hover:shadow-lg transition-shadow duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-serif text-lg text-foreground">
                    {hotel.name}
                  </h4>
                  <span className="text-gold font-sans text-sm">{hotel.price}</span>
                </div>
                <p className="text-sage font-sans text-xs uppercase tracking-wider mb-3">
                  {hotel.distance}
                </p>
                <p className="text-muted-foreground font-sans text-sm mb-4">
                  {hotel.description}
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-champagne/30">
                  <a
                    href={`tel:${hotel.phone}`}
                    className="flex items-center gap-1 text-sage hover:text-foreground transition-colors text-sm"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="font-sans">{hotel.phone}</span>
                  </a>
                  <a
                    href={hotel.website}
                    className="flex items-center gap-1 text-sage hover:text-foreground transition-colors text-sm ml-auto"
                  >
                    <span className="font-sans">Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative element */}
        <div className="flex justify-center mt-16">
          <div className="flex items-center gap-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-champagne" />
            <span className="text-gold text-2xl">♥</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-champagne" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TravelAccommodation;
