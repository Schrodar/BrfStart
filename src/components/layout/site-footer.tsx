import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { navGroups } from "@/config/site";
import { AddressDetails, EmailLink, PhoneLink } from "@/components/association";
import type { AssociationProfile } from "@/lib/types";

/** Länkfärg i footern: dämpad, mossgrön vid hover. */
const footerLink = "transition-colors duration-200 hover:text-moss";

/**
 * Footer i samma varma uttryck som resten av sajten: sandton över den
 * benvita bakgrunden, tunna varma linjer, föreningens namn i serif och
 * kolumnrubriker som ögonbrynsrader.
 */
export function SiteFooter({ association }: { association: AssociationProfile }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-sand/35">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 sm:py-16 lg:grid-cols-[1.5fr_repeat(5,1fr)] lg:gap-8">
        <div>
          <p className="font-display text-xl font-normal tracking-tight text-ink">
            {association.name}
          </p>
          <AddressDetails
            address={association}
            className="mt-4 text-sm leading-relaxed text-muted"
          />
          {association.organizationNumber ? (
            <p className="mt-3 text-sm text-muted">
              Org.nr {association.organizationNumber}
            </p>
          ) : null}
        </div>

        <div>
          <p className="eyebrow">Kontakt</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {association.contactEmail ? (
              <li>
                <EmailLink email={association.contactEmail} className={footerLink} />
              </li>
            ) : null}
            {association.contactPhone ? (
              <li>
                <PhoneLink phone={association.contactPhone} className={footerLink} />
              </li>
            ) : null}
            <li>
              <Link href={siteConfig.links.faultReport} className={footerLink}>
                Felanmälan
              </Link>
            </li>
          </ul>
        </div>

        {/* Sajtkarta ur navGroups – samma källa som toppmenyn och lådan, så
            att footern inte kan glida isär från resten av navigationen. */}
        {navGroups.map((group) => (
          <div key={group.id}>
            <p className="eyebrow">{group.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="eyebrow">Övrigt</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link href={siteConfig.links.login} className={footerLink}>
                Logga in / medlemssidor
              </Link>
            </li>
            <li>
              <Link href="/integritetspolicy" className={footerLink}>
                Integritetspolicy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
          © {year} {association.name}. Alla rättigheter förbehållna.
        </div>
      </div>
    </footer>
  );
}
