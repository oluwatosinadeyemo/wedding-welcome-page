import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GuestData {
  id: string;
  full_name: string;
  party_size: number;
  has_rsvp: boolean;
  rsvp_attending: string | null;
  has_pass: boolean;
}

export function useGuestLookup() {
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupGuest = useCallback(async (inviteCode: string) => {
    if (!inviteCode.trim()) {
      setError("Please enter your invite code");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "lookup_guest_by_invite_code",
        { code: inviteCode.trim() }
      );

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        setError("Invite code not found. Please check and try again.");
        setGuest(null);
        return null;
      }

      const guestData = data[0] as GuestData;
      setGuest(guestData);
      return guestData;
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setGuest(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGuest(null);
    setError(null);
  }, []);

  return { guest, isLoading, error, lookupGuest, reset };
}
