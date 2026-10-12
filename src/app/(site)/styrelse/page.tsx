import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { EmailLink } from "@/components/association";
import { getAssociationProfile, getBoardGrouped } from "@/lib/data";
import type { BoardMember } from "@/lib/types";
import { Container, EmptyState, PageIntro, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Styrelse",
};

function PersonCard({ person }: { person: BoardMember }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-[var(--card-shadow)]">
      <p className="eyebrow">{person.role}</p>
      <p className="title-card mt-3">{person.name}</p>
      {person.email ? (
        <a
          href={`mailto:${person.email}`}
          className="link-inline mt-2 block truncate text-sm"
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
  const link = "link-inline";

  return (
    <Section>
      <Container>
        <PageIntro
          eyebrow="Om föreningen"
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

        <div className="mt-12 space-y-14">
          {visible.length === 0 ? (
            <EmptyState title="Inga personer publicerade ännu" />
          ) : (
            visible.map((group) => (
              <div key={group.id}>
                <h2 className="title-section">
                  {group.name}
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
