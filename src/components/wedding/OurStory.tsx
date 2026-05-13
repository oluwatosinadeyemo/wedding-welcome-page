import coupleImage from "@/assets/couple-portrait.jpg";

const OurStory = () => {
  return (
    <section className="wedding-section relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-0 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-secondary/5 rounded-full blur-3xl -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <p className="wedding-subheading mb-4 text-primary">Our Journey</p>
          <h2 className="wedding-heading text-3xl sm:text-5xl md:text-7xl">Our Story</h2>
          <div className="wedding-divider mt-8 w-32" />
        </div>

        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <div className="pt-8 glass-card p-8">
              <p className="wedding-subheading text-xs mb-4 text-primary">How We Met</p>
              <p className="text-foreground font-serif text-2xl italic leading-relaxed">
                "A train ride, a second meeting, and four years of choosing each other, every single day."
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
