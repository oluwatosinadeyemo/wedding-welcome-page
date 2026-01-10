import coupleImage from "@/assets/couple-portrait.jpg";

const OurStory = () => {
  return (
    <section className="wedding-section relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <p className="wedding-subheading mb-4 text-primary">Our Journey</p>
          <h2 className="wedding-heading text-5xl md:text-7xl">Our Story</h2>
          <div className="wedding-divider mt-8 w-32" />
        </div>

        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <p className="text-muted-foreground leading-relaxed text-lg">
              It all began at a friend's birthday celebration in Lagos. Tosin noticed 
              Pelumi across the room, and their eyes met over a shared love for good 
              music and great conversation.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              What started as a chance encounter turned into hours of laughter, 
              deep conversations, and the beautiful realization that we had found 
              something truly special. After years of growing together, countless 
              adventures, and one unforgettable proposal, we're thrilled to celebrate 
              our love with you.
            </p>
            <div className="pt-8 glass-card p-8">
              <p className="wedding-subheading text-xs mb-4 text-primary">How We Met</p>
              <p className="text-foreground font-serif text-2xl italic leading-relaxed">
                "When you know, you know — and we knew from the very first moment."
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition duration-500" />
              <img
                src={coupleImage}
                alt="Tosin and Pelumi"
                className="relative w-full aspect-[3/4] object-cover rounded-3xl shadow-2xl"
              />
              {/* Decorative Frame */}
              <div className="absolute inset-4 border border-white/20 rounded-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurStory;
