import { MapPin, Car, Plane, Hotel, Phone, ExternalLink, Star } from "lucide-react";

const TravelAccommodation = () => {
  const hotels = [
    {
      name: "Abiis Hotel Abeokuta",
      distance: "15 mins to venue",
      description: "Comfortable accommodation with excellent hospitality and modern amenities",
      phone: "+234 803 123 4567",
      website: "#",
      price: "₦45,000",
      rating: 4,
    },
    {
      name: "IBD Hotel Abeokuta",
      distance: "10 mins to venue",
      description: "Well-appointed rooms with quality service and convenient location",
      phone: "+234 803 234 5678",
      website: "#",
      price: "₦55,000",
      rating: 4,
    },
    {
      name: "Mitros Residence Abeokuta",
      distance: "12 mins to venue",
      description: "Stylish residence offering premium comfort and personalized service",
      phone: "+234 803 345 6789",
      website: "#",
      price: "₦65,000",
      rating: 4,
    },
    {
      name: "Celias Suites Abeokuta",
      distance: "8 mins to venue",
      description: "Elegant suites with top-notch facilities and exceptional service",
      phone: "+234 803 456 7890",
      website: "#",
      price: "₦50,000",
      rating: 4,
    },
    {
      name: "Camas Hotel and Suites",
      distance: "20 mins to venue",
      description: "Spacious rooms with modern amenities and friendly staff",
      phone: "+234 803 567 8901",
      website: "#",
      price: "₦40,000",
      rating: 4,
    },
    {
      name: "Park Inn by Radisson Abeokuta",
      distance: "25 mins to venue",
      description: "Premier luxury hotel with world-class amenities and conference facilities",
      phone: "+234 803 678 9012",
      website: "#",
      price: "₦230,000",
      rating: 5,
    },
    {
      name: "Conference Hotel & Suites",
      distance: "20 mins to venue",
      description: "5-star hotel with extensive facilities and premium dining",
      phone: "+234 803 789 0123",
      website: "#",
      price: "₦195,000",
      rating: 5,
    },
    {
      name: "Green Legacy Resort",
      distance: "30 mins to venue",
      description: "Located at the Olusegun Obasanjo Presidential Library complex",
      phone: "+234 803 890 1234",
      website: "#",
      price: "₦145,000",
      rating: 5,
    },
    {
      name: "Richton Hotel & Suites",
      distance: "15 mins to venue",
      description: "Modern amenities with high privacy and excellent service",
      phone: "+234 803 901 2345",
      website: "#",
      price: "₦138,000",
      rating: 4,
    },
    {
      name: "Providence Hotel and Suites",
      distance: "25 mins to venue",
      description: "Highly recommended for its pool, spa, and exceptional service",
      phone: "+234 803 012 3456",
      website: "#",
      price: "₦100,000",
      rating: 4,
    },
  ];

  const directions = [
    {
      icon: Plane,
      title: "By Air",
      description: "Fly into Murtala Muhammed International Airport (LOS) in Lagos, approximately 80 km from Abeokuta. Arrange ground transportation or use our shuttle service.",
    },
    {
      icon: Car,
      title: "By Car",
      description: "From Lagos, take the Lagos-Abeokuta Expressway. The venue is located in the heart of Abeokuta with ample parking available.",
    },
  ];

  return (
    <section id="travel" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20 animate-fade-in">
          <p className="text-primary font-sans uppercase tracking-[0.2em] text-sm mb-4 font-medium">
            Plan Your Visit
          </p>
          <h2 className="font-serif text-5xl md:text-7xl text-foreground mb-4 font-medium">
            Travel & Stay
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            We've curated the best accommodations in Abeokuta for our guests. Mention "Tosin & Pelumi Wedding" for special rates.
          </p>
        </div>

        {/* Directions */}
        <div className="grid md:grid-cols-2 gap-6 mb-20 animate-fade-in-up">
          {directions.map((item, index) => (
            <div
              key={item.title}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative glass-card p-8">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl text-foreground mb-3">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground font-sans leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="mb-20 animate-fade-in-up">
          <div className="glass-card p-2 overflow-hidden">
            <div className="aspect-[16/9] md:aspect-[21/9] rounded-xl overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126846.42774998516!2d3.2819444!3d7.1475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103a4c5430c0f159%3A0x91b25bd7a8c90c59!2sAbeokuta%2C%20Ogun%20State%2C%20Nigeria!5e0!3m2!1sen!2sng!4v1700000000000!5m2!1sen!2sng"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Wedding Venue Location"
                className="grayscale-[20%] contrast-[1.1]"
              />
            </div>
            <div className="flex items-center justify-center gap-2 py-4 text-primary">
              <MapPin className="w-4 h-4" />
              <span className="font-sans text-sm">
                Lambs Event Centre, Abeokuta, Ogun State, Nigeria
              </span>
            </div>
          </div>
        </div>

        {/* Hotels */}
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="w-20 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <Hotel className="w-6 h-6 text-primary" />
            <h3 className="font-serif text-3xl text-foreground">Recommended Hotels</h3>
            <Hotel className="w-6 h-6 text-primary" />
            <div className="w-20 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {hotels.map((hotel, index) => (
              <div
                key={hotel.name}
                className="group relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative glass-card p-5 h-full hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(hotel.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-gold text-gold" />
                    ))}
                  </div>
                  <h4 className="font-serif text-base text-foreground mb-1 leading-tight">
                    {hotel.name}
                  </h4>
                  <p className="text-primary font-sans text-xs uppercase tracking-wider mb-2">
                    {hotel.distance}
                  </p>
                  <p className="text-muted-foreground font-sans text-xs mb-3 leading-relaxed">
                    {hotel.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xl font-serif text-foreground">{hotel.price}</span>
                    <span className="text-xs text-muted-foreground">/night</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={`tel:${hotel.phone}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                    <a
                      href={hotel.website}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors text-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Book</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TravelAccommodation;
