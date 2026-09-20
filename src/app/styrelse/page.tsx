import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { EmailLink } from "@/components/association";
import { getAssociationProfile, getBoardGrouped } from "@/lib/data";
import type { BoardMember } from "@/lib/types";
import { Container, EmptyState, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Styrelse",
};

function PersonCard({ person }: { person: BoardMember }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
        {person.role}
      </p>
      <p className="mt-1 font-semibold text-foreground">{person.name}</p>
      {person.email ? (
        <a
          href={`mailto:${person.email}`}
          className="mt-1 block truncate text-sm text-brand-700 hover:underline"
        >
          {person.email}
        </a>
      ) : null}
    </div>
  );
}

export default async function BoardPage() {
  const [groups, association] = await Promise.all([
    getBoardGrouped(),
    getAssociationProfile(),
  ]);
  // Tomma grupper är ett adminstadium, inte något besökare behöver se.
  const visible = groups.filter((g) => g.members.length > 0);
  const link = "text-brand-700 hover:underline";

  return (
    <Section>
      <Container>
        <PageHeader
          title="Styrelse och grupper"
          description={
            <>
              Styrelsen väljs på föreningsstämman och ansvarar för föreningens
              förvaltning. Du når oss{" "}
              {association.contactEmail ? (
                <>
                  på{" "}
                  <EmailLink email={association.contactEmail} className={link} />{" "}
                  eller{" "}
                </>
              ) : null}
              via{" "}
              <Link href={siteConfig.links.contact} className={link}>
                kontaktsidan
              </Link>
              .
            </>
          }
        />

        <div className="mt-8 space-y-10">
          {visible.length === 0 ? (
            <EmptyState title="Inga personer publicerade ännu" />
          ) : (
            visible.map((group) => (
              <div key={group.id}>
                <h2 className="text-xl font-bold tracking-tight">
                  {group.name}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.members.map((person) => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Container>
    </Section>
  );
}
