import { MapPin, Car, Plane, Hotel, Phone, ExternalLink, Star } from "lucide-react";

const TravelAccommodation = () => {
  const hotelGroups = [
    {
      label: "Closest (Under 10 mins)",
      hotels: [
        {
          name: "Celias Suites Abeokuta",
          distance: "8 mins to venue",
          description: "Elegant suites with top-notch facilities and exceptional service",
          phone: "+234 809 991 3503",
          website: "https://www.celiasuites.com/",
          price: "₦50,000",
          rating: 4,
        },
      ],
    },
    {
      label: "Nearby (10-15 mins)",
      hotels: [
        {
          name: "IBD Hotel Abeokuta",
          distance: "10 mins to venue",
          description: "Well-appointed rooms with quality service and convenient location",
          phone: "+234 803 984 6021",
          website: "https://ibdhotels.com/",
          price: "₦55,000",
          rating: 4,
        },
        {
          name: "Mitros Residence Abeokuta",
          distance: "12 mins to venue",
          description: "Stylish residence offering premium comfort and personalized service",
          phone: "+234 816 939 0399",
          website: "https://www.mitrosresidences.com/",
          price: "₦65,000",
          rating: 4,
        },
        {
          name: "Abiis Hotel Abeokuta",
          distance: "15 mins to venue",
          description: "Comfortable accommodation with excellent hospitality and modern amenities",
          phone: "+234 906 202 2287",
          website: "https://abiishotels.com/",
          price: "₦45,000",
          rating: 4,
        },
        {
          name: "Richton Hotel & Suites",
          distance: "15 mins to venue",
          description: "Modern amenities with high privacy and excellent service",
          phone: "+234 704 044 8953",
          website: "https://www.tripadvisor.com/Hotel_Review-g1760497-d7612838-Reviews-Richton_Hotel_and_Suites-Abeokuta_Ogun_State.html",
          price: "₦138,000",
          rating: 4,
        },
      ],
    },
    {
      label: "Further (20+ mins)",
      hotels: [
        {
          name: "Camas Hotel and Suites",
          distance: "20 mins to venue",
          description: "Spacious rooms with modern amenities and friendly staff",
          phone: "+234 915 155 0000",
          website: "https://camashotel.org/",
          price: "₦40,000",
          rating: 4,
        },
        {
          name: "Conference Hotel & Suites",
          distance: "20 mins to venue",
          description: "5-star hotel with extensive facilities and premium dining",
          phone: "+234 703 178 6648",
          website: "https://conferencehotelnigeria.com/abeokuta/",
          price: "₦195,000",
          rating: 5,
        },
        {
          name: "Park Inn by Radisson Abeokuta",
          distance: "25 mins to venue",
          description: "Premier luxury hotel with world-class amenities and conference facilities",
          phone: "+234 813 986 0020",
          website: "https://www.radissonhotels.com/en-us/hotels/park-inn-abeokuta",
          price: "₦230,000",
          rating: 5,
        },
        {
          name: "Providence Hotel and Suites",
          distance: "25 mins to venue",
          description: "Highly recommended for its pool, spa, and exceptional service",
          phone: "+234 815 693 6515",
          website: "https://abeokuta.providencehotelandsuites.com/",
          price: "₦100,000",
          rating: 4,
        },
        {
          name: "Green Legacy Resort",
          distance: "30 mins to venue",
          description: "Located at the Olusegun Obasanjo Presidential Library complex",
          phone: "+234 809 524 6635",
          website: "https://greenlegacyresort.com/",
          price: "₦145,000",
          rating: 5,
        },
      ],
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
          <h2 className="font-serif text-3xl sm:text-5xl md:text-7xl text-foreground mb-4 font-medium">
            Travel & Stay
          </h2>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto mt-6">
            We've curated the best accommodations in Abeokuta for our guests.
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
                src="https://www.google.com/maps?q=The+Lamb's+Events,+4CR2%2BHH,+Ilugun+110118,+Ogun+State,+Nigeria&output=embed"
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
              <span className="font-sans text-sm text-center">
                The Lamb's Events, KM 3, Olabisi Onabanjo Way, After Chrisland University, Ilugun, Abeokuta
              </span>
            </div>
          </div>
        </div>

        {/* Hotels */}
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-12">
            <div className="hidden sm:block w-20 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <Hotel className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <h3 className="font-serif text-xl sm:text-3xl text-foreground">Recommended Hotels</h3>
            <Hotel className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <div className="hidden sm:block w-20 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>

          {hotelGroups.map((group) => (
            <div key={group.label} className="mb-12">
              <h4 className="font-serif text-xl text-foreground mb-6 text-center">
                {group.label}
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {group.hotels.map((hotel) => (
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
                          className="flex-1 flex items-center justify-center gap-1 py-3 sm:py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={hotel.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-3 sm:py-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors text-xs"
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default TravelAccommodation;
