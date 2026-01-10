import coupleImage from "@/assets/couple-portrait.jpg";

const OurStory = () => {
  return (
    <section className="wedding-section bg-card/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="wedding-subheading mb-4">Our Journey</p>
          <h2 className="wedding-heading text-4xl md:text-5xl">Our Story</h2>
          <div className="wedding-divider mt-6" />
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="order-2 md:order-1 space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              It all began at a friend's birthday celebration in Lagos. Tosin noticed 
              Pelumi across the room, and their eyes met over a shared love for good 
              music and great conversation.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              What started as a chance encounter turned into hours of laughter, 
              deep conversations, and the beautiful realization that we had found 
              something truly special. After years of growing together, countless 
              adventures, and one unforgettable proposal, we're thrilled to celebrate 
              our love with you.
            </p>
            <div className="pt-4 space-y-2">
              <p className="wedding-subheading text-xs">How We Met</p>
              <p className="text-foreground font-serif text-lg italic">
                "When you know, you know — and we knew from the very first moment."
              </p>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-sage-light to-rose-light rounded-sm opacity-50" />
              <img
                src={coupleImage}
                alt="Tosin and Pelumi"
                className="relative w-full aspect-[3/4] object-cover rounded-sm shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurStory;
