import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Users, MessageSquare, CheckCircle, ArrowRight, Loader2, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestLookup, type GuestData } from "@/hooks/use-guest-lookup";
import { rsvpFormSchema, manualRsvpSchema, type RSVPFormValues, type ManualRsvpValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const RSVPForm = () => {
  const [step, setStep] = useState<"lookup" | "form" | "manual" | "confirmation">("lookup");
  const [inviteCode, setInviteCode] = useState("");
  const [submittedData, setSubmittedData] = useState<{ attending: string; number_of_guests: number; full_name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { guest, isLoading, error, lookupGuest, reset: resetLookup } = useGuestLookup();
  const { toast } = useToast();

  const form = useForm<RSVPFormValues>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues: {
      attending: undefined,
      number_of_guests: 1,
      message: "",
    },
  });

  const manualForm = useForm<ManualRsvpValues>({
    resolver: zodResolver(manualRsvpSchema),
    defaultValues: {
      full_name: "",
      attending: undefined,
      number_of_guests: 1,
      message: "",
    },
  });

  const handleLookup = async () => {
    const result = await lookupGuest(inviteCode);
    if (result) {
      // Pre-fill if they already RSVP'd
      if (result.has_rsvp) {
        const { data: existingRsvp } = await (supabase
          .from("rsvps" as any) as any)
          .select("*")
          .eq("guest_id", result.id)
          .single();

        if (existingRsvp) {
          form.setValue("attending", existingRsvp.attending as "yes" | "no" | "maybe");
          form.setValue("number_of_guests", existingRsvp.number_of_guests);
          form.setValue("message", existingRsvp.message || "");
        }
      }
      setStep("form");
    }
  };

  const onSubmit = async (values: RSVPFormValues) => {
    if (!guest) return;
    setIsSubmitting(true);

    try {
      const { error: upsertError } = await (supabase
        .from("rsvps" as any) as any)
        .upsert(
          {
            guest_id: guest.id,
            attending: values.attending,
            number_of_guests: values.number_of_guests,
            message: values.message || null,
          },
          { onConflict: "guest_id" }
        );

      if (upsertError) throw upsertError;

      setSubmittedData({
        attending: values.attending,
        number_of_guests: values.number_of_guests,
        full_name: guest.full_name,
      });
      setStep("confirmation");
      toast({
        title: guest.has_rsvp ? "RSVP Updated!" : "RSVP Submitted!",
        description: "Thank you for letting us know.",
      });
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

  const onManualSubmit = async (values: ManualRsvpValues) => {
    setIsSubmitting(true);

    try {
      // Create a guest record with a generated invite code
      const generatedCode = `WALK-IN-${Date.now().toString(36).toUpperCase()}`;
      const { data: newGuest, error: guestError } = await (supabase
        .from("guests" as any) as any)
        .insert({
          full_name: values.full_name.trim(),
          invite_code: generatedCode,
          party_size: values.number_of_guests,
        })
        .select("id")
        .single();

      if (guestError) throw guestError;

      // Create the RSVP
      const { error: rsvpError } = await (supabase
        .from("rsvps" as any) as any)
        .insert({
          guest_id: newGuest.id,
          attending: values.attending,
          number_of_guests: values.number_of_guests,
          message: values.message || null,
        });

      if (rsvpError) throw rsvpError;

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
    setStep("lookup");
    setInviteCode("");
    setSubmittedData(null);
    resetLookup();
    form.reset();
    manualForm.reset();
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Step 1: Invite Code Lookup */}
      {step === "lookup" && (
        <div className="glass-card p-8 animate-fade-in">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-serif text-2xl text-foreground mb-2 text-center">
            Find Your Invitation
          </h3>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Enter the invite code from your invitation card
          </p>
          <div className="space-y-4">
            <Input
              placeholder="e.g. TP-ADEOLA-001"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="bg-background/50 border-border/50 rounded-xl text-center text-lg py-6 uppercase"
              autoFocus
            />
            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}
            <Button
              onClick={handleLookup}
              disabled={!inviteCode.trim() || isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Find My Invitation"
              )}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card/40 px-3 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            onClick={() => setStep("manual")}
            variant="outline"
            className="w-full py-6 rounded-xl border-border/50 text-sm font-sans"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            RSVP Without Invite Code
          </Button>
        </div>
      )}

      {/* Step 2a: RSVP Form (with invite code) */}
      {step === "form" && guest && (
        <div className="glass-card p-8 animate-fade-in">
          <div className="text-center mb-8">
            <p className="text-primary font-sans uppercase tracking-widest text-xs mb-2">
              {guest.has_rsvp ? "Update Your Response" : "You're Invited"}
            </p>
            <h3 className="font-serif text-3xl text-foreground">
              Welcome, {guest.full_name}!
            </h3>
            {guest.party_size > 1 && (
              <p className="text-muted-foreground text-sm mt-2">
                Your invitation is for up to {guest.party_size} guests
              </p>
            )}
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            {form.watch("attending") !== "no" && guest.party_size > 1 && (
              <div className="space-y-3">
                <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Number of guests attending
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={guest.party_size}
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

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : guest.has_rsvp ? (
                  "Update Response"
                ) : (
                  "Submit RSVP"
                )}
              </Button>
              <Button
                type="button"
                onClick={handleStartOver}
                variant="outline"
                className="py-6 rounded-xl border-border/50"
              >
                Back
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2b: Manual RSVP Form (without invite code) */}
      {step === "manual" && (
        <div className="glass-card p-8 animate-fade-in">
          <div className="text-center mb-8">
            <p className="text-primary font-sans uppercase tracking-widest text-xs mb-2">
              You're Invited
            </p>
            <h3 className="font-serif text-3xl text-foreground">
              RSVP
            </h3>
          </div>

          <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-3">
              <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Your Full Name
              </Label>
              <Input
                placeholder="Enter your full name"
                {...manualForm.register("full_name")}
                className="bg-background/50 border-border/50 rounded-xl text-center"
                autoFocus
              />
              {manualForm.formState.errors.full_name && (
                <p className="text-destructive text-xs">{manualForm.formState.errors.full_name.message}</p>
              )}
            </div>

            {/* Attending */}
            <div className="space-y-3">
              <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Will you be joining us?
              </Label>
              <RadioGroup
                value={manualForm.watch("attending")}
                onValueChange={(value) => manualForm.setValue("attending", value as "yes" | "no" | "maybe")}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
              >
                {[
                  { value: "yes", label: "Joyfully Accept" },
                  { value: "maybe", label: "Not Sure Yet" },
                  { value: "no", label: "Regretfully Decline" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`manual-attending-${option.value}`}
                    className={`flex items-center justify-center p-4 rounded-xl border cursor-pointer transition-all text-center text-xs font-sans ${
                      manualForm.watch("attending") === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background/30 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`manual-attending-${option.value}`}
                      className="sr-only"
                    />
                    {option.label}
                  </Label>
                ))}
              </RadioGroup>
              {manualForm.formState.errors.attending && (
                <p className="text-destructive text-xs">{manualForm.formState.errors.attending.message}</p>
              )}
            </div>

            {/* Number of Guests */}
            {manualForm.watch("attending") !== "no" && (
              <div className="space-y-3">
                <Label className="text-foreground font-sans text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Number of guests attending
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  {...manualForm.register("number_of_guests", { valueAsNumber: true })}
                  className="bg-background/50 border-border/50 rounded-xl text-center"
                />
                {manualForm.formState.errors.number_of_guests && (
                  <p className="text-destructive text-xs">
                    {manualForm.formState.errors.number_of_guests.message}
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
                {...manualForm.register("message")}
                className="bg-background/50 border-border/50 rounded-xl min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-sm uppercase tracking-wider font-sans"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Submit RSVP"
                )}
              </Button>
              <Button
                type="button"
                onClick={handleStartOver}
                variant="outline"
                className="py-6 rounded-xl border-border/50"
              >
                Back
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Confirmation */}
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
              href="/#pass"
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
