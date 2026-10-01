"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MemberStatus, Role } from "@/lib/types";

/** Det headern och felanmälan behöver veta om den inloggade (från /api/me). */
export interface SessionMember {
  fullName: string;
  email: string;
  role: Role;
  status: MemberStatus;
}

export interface CurrentMemberState {
  /** null = inte kontrollerat än, annars om det finns en session. */
  signedIn: boolean | null;
  /** Medlemsprofilen i den här föreningen, när /api/me har svarat. */
  member: SessionMember | null;
}

// En förfrågan per inloggad användare, delad mellan alla komponenter.
let request: { userId: string; promise: Promise<SessionMember | null> } | null =
  null;

function loadMember(userId: string): Promise<SessionMember | null> {
  if (request?.userId !== userId) {
    request = {
      userId,
      promise: fetch("/api/me", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { member: null }))
        .then((data: { member: SessionMember | null }) => data.member)
        .catch(() => null),
    };
  }
  return request.promise;
}

/**
 * Inloggningen, läst i webbläsaren. De publika sidorna renderas statiskt och
 * cachas, så servern vet inte vem som tittar – headern och felanmälan frågar
 * här i stället.
 *
 * Sessionen läses lokalt ur cookien, utan nätverksfråga. Bara när det finns en
 * session hämtas medlemsprofilen från /api/me. Kontrolleras om vid varje
 * sidbyte: inloggningen sker i en server action som sätter cookien och skickar
 * vidare, och headern i layouten monteras inte om.
 */
export function useCurrentMember(): CurrentMemberState {
  const pathname = usePathname();
  const [state, setState] = useState<CurrentMemberState>({
    signedIn: null,
    member: null,
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!active) return;
      if (!userId) {
        request = null;
        setState({ signedIn: false, member: null });
        return;
      }
      setState((prev) => ({ signedIn: true, member: prev.member }));
      const member = await loadMember(userId);
      if (active) setState({ signedIn: true, member });
    }

    void check();
    const { data } = supabase.auth.onAuthStateChange(() => void check());
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  return state;
}
