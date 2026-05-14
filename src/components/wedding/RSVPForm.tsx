import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Users, MessageSquare, CheckCircle, ArrowRight, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { manualRsvpSchema, type ManualRsvpValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RSVPFormProps {
  onSubmitSuccess?: (attending: string, fullName: string) => void;
}

const RSVPForm = ({ onSubmitSuccess }: RSVPFormProps = {}) => {
  const [step, setStep] = useState<"form" | "confirmation">("form");
  const [submittedData, setSubmittedData] = useState<{ attending: string; number_of_guests: number; full_name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ManualRsvpValues>({
    resolver: zodResolver(manualRsvpSchema),
    defaultValues: {
      full_name: "",
      attending: undefined,
      number_of_guests: 1,
      message: "",
    },
  });

  const onSubmit = async (values: ManualRsvpValues) => {
    setIsSubmitting(true);

    try {
      // Use SECURITY DEFINER RPC to bypass guests table RLS
      const { error: rpcError } = await (supabase.rpc as any)(
        "submit_walkin_rsvp",
        {
          p_full_name: values.full_name.trim(),
          p_attending: values.attending,
          p_number_of_guests: values.number_of_guests,
          p_message: values.message || null,
        }
      );

      if (rpcError) throw rpcError;

      // Persist RSVP'd guest name so they can upload to the gallery
      if (values.attending !== "no") {
        localStorage.setItem("wedding_guest_name", values.full_name.trim());
        localStorage.setItem("wedding_guest_rsvpd", "true");
      }

      setSubmittedData({
        attending: values.attending,
        number_of_guests: values.number_of_guests,
        full_name: values.full_name.trim(),
      });
      setStep("confirmation");
      toast({
        title: "RSVP Submitted!",
        description: "Thank you for letting us know.",
      });
      onSubmitSuccess?.(values.attending, values.full_name.trim());
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep("form");
    setSubmittedData(null);
    form.reset();
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* RSVP Form */}
      {step === "form" && (
        <div className="glass-card p-8 animate-fade-in">
          <div className="text-center mb-8">
            <h3 className="font-serif text-3xl text-foreground mb-2">
              Kindly Respond
            </h3>
            <p className="text-muted-foreground text-sm">
              Please let us know if you'll be able to celebrate with us. Kindly respond by May 30th, 2026.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-3">
              <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Your Full Name
              </Label>
              <Input
                placeholder="Enter your full name"
                {...form.register("full_name")}
                className="bg-background/50 border-border/50 rounded-xl text-center"
                autoFocus
              />
              {form.formState.errors.full_name && (
                <p className="text-destructive text-xs">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            {/* Attending */}
            <div className="space-y-3">
              <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Will you be joining us?
              </Label>
              <RadioGroup
                value={form.watch("attending")}
                onValueChange={(value) => form.setValue("attending", value as "yes" | "no" | "maybe")}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
              >
                {[
                  { value: "yes", label: "Joyfully Accept" },
                  { value: "maybe", label: "Not Sure Yet" },
                  { value: "no", label: "Regretfully Decline" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`attending-${option.value}`}
                    className={`flex items-center justify-center p-4 rounded-xl border cursor-pointer transition-all text-center text-xs font-sans ${
                      form.watch("attending") === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background/30 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`attending-${option.value}`}
                      className="sr-only"
                    />
                    {option.label}
                  </Label>
                ))}
              </RadioGroup>
              {form.formState.errors.attending && (
                <p className="text-destructive text-xs">{form.formState.errors.attending.message}</p>
              )}
            </div>

            {/* Number of Guests */}
            {form.watch("attending") !== "no" && (
              <div className="space-y-3">
                <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Number of guests attending
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  {...form.register("number_of_guests", { valueAsNumber: true })}
                  className="bg-background/50 border-border/50 rounded-xl text-center"
                />
                {form.formState.errors.number_of_guests && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.number_of_guests.message}
                  </p>
                )}
              </div>
            )}

            {/* Message */}
            <div className="space-y-3">
              <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Message to the couple (optional)
              </Label>
              <Textarea
                placeholder="Share your well wishes..."
                {...form.register("message")}
                className="bg-background/50 border-border/50 rounded-xl min-h-[100px] resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Submit RSVP"
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Confirmation */}
      {step === "confirmation" && submittedData && (
        <div className="glass-card p-8 animate-fade-in text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="font-serif text-3xl text-foreground mb-4">
            {submittedData.attending === "yes"
              ? "We Can't Wait to See You!"
              : submittedData.attending === "maybe"
              ? "We Hope You Can Make It!"
              : "We'll Miss You!"}
          </h3>
          <p className="text-muted-foreground mb-8">
            {submittedData.attending === "yes"
              ? `Thank you, ${submittedData.full_name}! Your RSVP for ${submittedData.number_of_guests} guest${submittedData.number_of_guests > 1 ? "s" : ""} has been confirmed.`
              : submittedData.attending === "maybe"
              ? `Thank you, ${submittedData.full_name}. You can update your response anytime before the deadline.`
              : `Thank you for letting us know, ${submittedData.full_name}. You'll be in our thoughts on the big day.`}
          </p>

          {submittedData.attending === "yes" && (
            <a
              href={`/pass?name=${encodeURIComponent(submittedData.full_name)}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-300 font-sans text-sm uppercase tracking-wider mb-6"
            >
              Generate Your Digital Pass
              <ArrowRight className="w-4 h-4" />
            </a>
          )}

          <div className="mt-6">
            <Button
              onClick={handleStartOver}
              variant="outline"
              className="rounded-full border-border/50 px-8"
            >
              RSVP for Another Guest
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RSVPForm;
