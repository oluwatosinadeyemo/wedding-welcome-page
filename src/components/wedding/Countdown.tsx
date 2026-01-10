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
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <p className="text-primary font-sans uppercase tracking-[0.2em] text-sm mb-4 font-medium">
            Counting Down To
          </p>
          <h2 className="font-serif text-4xl md:text-6xl text-foreground mb-2 font-medium">
            Our Special Day
          </h2>
          <p className="text-muted-foreground font-sans mt-4">
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
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                <div className="relative w-20 h-24 md:w-32 md:h-40 glass-card flex flex-col items-center justify-center">
                  <span className="font-serif text-4xl md:text-6xl text-foreground font-medium">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <span className="mt-4 text-primary font-sans uppercase tracking-widest text-xs md:text-sm font-medium">
                {unit.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-16">
          <div className="flex items-center gap-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <span className="text-secondary text-3xl">♥</span>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Countdown;
