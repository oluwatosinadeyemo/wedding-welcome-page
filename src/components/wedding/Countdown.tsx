import { useState, useEffect } from "react";

const Countdown = () => {
  const weddingDate = new Date("2026-12-12T00:00:00");
  
  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = weddingDate.getTime() - now.getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeUnits = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <section className="py-20 bg-ivory">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in">
          <p className="text-sage font-sans uppercase tracking-[0.3em] text-sm mb-4">
            Counting Down To
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-2">
            Our Special Day
          </h2>
          <p className="text-muted-foreground font-sans">
            December 12th, 2026
          </p>
        </div>

        <div className="flex justify-center gap-4 md:gap-8 animate-fade-in-up">
          {timeUnits.map((unit, index) => (
            <div
              key={unit.label}
              className="flex flex-col items-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative">
                <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-lg shadow-lg border border-champagne/30 flex items-center justify-center">
                  <span className="font-serif text-3xl md:text-5xl text-foreground">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 md:w-24 h-1 bg-gradient-to-r from-transparent via-rose/30 to-transparent" />
              </div>
              <span className="mt-4 text-sage font-sans uppercase tracking-widest text-xs md:text-sm">
                {unit.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-12">
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

export default Countdown;
