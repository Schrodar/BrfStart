import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { navGroups } from "@/config/site";
import { AddressDetails, EmailLink, PhoneLink } from "@/components/association";
import type { AssociationProfile } from "@/lib/types";

export function SiteFooter({ association }: { association: AssociationProfile }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="font-semibold text-foreground">{association.name}</p>
          <AddressDetails
            address={association}
            className="mt-2 text-sm text-muted"
          />
          {association.organizationNumber ? (
            <p className="mt-2 text-sm text-muted">
              Org.nr {association.organizationNumber}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Kontakt</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {association.contactEmail ? (
              <li>
                <EmailLink
                  email={association.contactEmail}
                  className="hover:text-brand-700"
                />
              </li>
            ) : null}
            {association.contactPhone ? (
              <li>
                <PhoneLink
                  phone={association.contactPhone}
                  className="hover:text-brand-700"
                />
              </li>
            ) : null}
            <li>
              <Link
                href={siteConfig.links.faultReport}
                className="hover:text-brand-700"
              >
                Felanmälan
              </Link>
            </li>
          </ul>
        </div>

        {/* Sajtkarta ur navGroups – samma källa som toppmenyn och lådan, så
            att footern inte kan glida isär från resten av navigationen. */}
        {navGroups.map((group) => (
          <div key={group.id}>
            <p className="text-sm font-semibold text-foreground">
              {group.title}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-brand-700">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="text-sm font-semibold text-foreground">Övrigt</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>
              <Link
                href={siteConfig.links.login}
                className="hover:text-brand-700"
              >
                Logga in / medlemssidor
              </Link>
            </li>
            <li>
              <Link href="/integritetspolicy" className="hover:text-brand-700">
                Integritetspolicy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          © {year} {association.name}. Alla rättigheter förbehållna.
        </div>
      </div>
    </footer>
  );
}
