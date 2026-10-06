// NAVIGERING: src/components/layout/site-header.tsx

"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/page-transition/TransitionLink";
import { NavDrawer } from "@/components/layout/nav-drawer";
import { AuthButton } from "@/components/layout/auth-button";
import { AssociationLogo } from "@/components/association";
import { siteConfig } from "@/config/siteConfig";
import type { AssociationProfile } from "@/lib/types";
import { useCurrentMember } from "@/lib/use-current-member";
import { cn, shortNameOf } from "@/lib/utils";

interface SiteHeaderProps {
  association: AssociationProfile;
  heroTitle: string;
  heroSubtitle: string;
}

export function SiteHeader({
  association,
  heroTitle,
  heroSubtitle,
}: SiteHeaderProps) {
  const pathname = usePathname();
  // Sidorna är statiska, så inloggningen läses här i webbläsaren.
  const { signedIn, member } = useCurrentMember();
  const isHome = pathname === "/";
  const shortName = shortNameOf(association);
  const { hero } = siteConfig;

  if (!isHome) {
    return (
      <header className="relative z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <TransitionLink href="/" className="flex items-center gap-2.5">
            <AssociationLogo size={36} priority alt="" />
            <span className="font-display text-lg font-medium text-foreground">
              {shortName}
            </span>
          </TransitionLink>

          <div className="flex items-center gap-2">
            <AuthButton signedIn={signedIn} variant="default" />
            {/* NavDrawer visar en platshållare här. Själva knappen portaleras till body. */}
            <NavDrawer member={member} association={association} variant="default" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="relative isolate flex min-h-svh overflow-hidden bg-brand-800 text-white">
      {/* Bakgrund (helskärm), vald i siteConfig.hero: film före bild. brand-800
          på headern syns tills den laddat – och hela tiden när ingen är vald. */}
      {hero.video ? (
        <video
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src={hero.video}
          poster={hero.image}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : hero.image ? (
        <div aria-hidden="true" className="hero-image absolute inset-0">
          <Image
            src={hero.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      {/* Toning för läsbarhet i föreningens färg (.hero-scrim i globals.css). */}
      <div aria-hidden="true" className="hero-scrim absolute inset-0" />

      {/* Övre navigeringsrad ovanpå heron. Inte sticky. */}
      <div className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-24 sm:px-6">
          <TransitionLink href="/" className="flex items-center gap-2.5">
            <AssociationLogo size={40} priority light alt="" />
            <span className="font-display text-lg font-medium text-white sm:text-xl">
              {shortName}
            </span>
          </TransitionLink>

          <div className="flex items-center gap-2">
            <AuthButton signedIn={signedIn} variant="hero" />
            {/* NavDrawer visar en platshållare här. Själva knappen portaleras till body. */}
            <NavDrawer member={member} association={association} variant="hero" />
          </div>
        </div>
      </div>

      {/* Hero-innehåll. Headern tar hela skärmens höjd. */}
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl items-end px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-40 lg:pb-28">
        <div className="max-w-3xl">
          {association.city ? (
            <p
              className="hero-fade font-body text-sm font-semibold uppercase tracking-[0.2em] text-white/70"
              style={{ animationDelay: "1.5s" }}
            >
              {association.city}
            </p>
          ) : null}

          <h1
            className="hero-fade mt-4 max-w-[15ch] font-display text-4xl font-medium leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "1.65s" }}
          >
            {heroTitle}
          </h1>

          {heroSubtitle ? (
            <p
              className="hero-fade mt-6 max-w-2xl font-body text-base leading-relaxed text-white/80 sm:text-xl"
              style={{ animationDelay: "1.85s" }}
            >
              {heroSubtitle}
            </p>
          ) : null}

          <div
            className="hero-fade mt-9 flex flex-wrap gap-3"
            style={{ animationDelay: "2s" }}
          >
            <TransitionLink
              href="/nyheter"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 font-body text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50 focus-visible:outline-white"
            >
              Senaste nytt
            </TransitionLink>

            <TransitionLink
              href="/felanmalan"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 bg-white/5 px-5 py-3 font-body text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline-white"
            >
              Gör en felanmälan
            </TransitionLink>
          </div>
        </div>
      </div>

      <a
        href="#start-content"
        aria-label="Fortsätt till sidans innehåll"
        className={cn(
          "absolute bottom-5 left-1/2 z-20 -translate-x-1/2",
          "inline-flex h-11 w-11 items-center justify-center rounded-full",
          "border border-white/25 bg-black/10 text-white/80 backdrop-blur-sm",
          "transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-white",
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </a>
    </header>
  );
}
