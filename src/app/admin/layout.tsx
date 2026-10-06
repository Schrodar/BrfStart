import { Container } from "@/components/ui";
import { SubNav, type SubNavItem } from "@/components/layout/sub-nav";
import { getSupportSession, requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { endSupportAction } from "./support/actions";

const adminNav: SubNavItem[] = [
  { href: "/admin", label: "Översikt" },
  { href: "/admin/nyheter", label: "Nyheter" },
  { href: "/admin/dokument", label: "Dokument" },
  { href: "/admin/styrelse", label: "Styrelse" },
  {
    href: "/admin/foreningsinfo",
    label: "Föreningsinfo",
    children: [
      { href: "/admin/foreningsinfo", label: "Fakta" },
      { href: "/admin/foreningsinfo/kontakt", label: "Namn och kontakt" },
      { href: "/admin/foreningsinfo/ekonomi", label: "Ekonomi" },
    ],
  },
  { href: "/admin/innehall", label: "Innehåll" },
  { href: "/admin/felanmalningar", label: "Felanmälningar" },
  { href: "/admin/medlemmar", label: "Medlemmar" },
  { href: "/admin/lagenheter", label: "Lägenheter" },
  { href: "/admin/till-salu", label: "Till salu" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const support = await getSupportSession();

  return (
    // theme-admin återställer adminpanelens neutrala färger, kanter, skuggor och
    // typsnitt – den publika sajtens varma tema (theme-site på <body>) gäller
    // inte här. Se DESIGNSPRÅK i globals.css.
    <div className="theme-admin min-h-screen">
      {/* Supportläget ska aldrig vara osynligt: styrelsen ser bannern om de är
          inloggade samtidigt, och den som hjälper till ser när tiden går ut. */}
      {support ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm text-amber-900">
              <strong>Supportläge.</strong> {support.adminName} från plattformen
              är inloggad som styrelsen. Åtkomsten upphör{" "}
              {formatDateTime(support.expiresAt)}.
            </p>
            <form action={endSupportAction}>
              <button className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100">
                Avsluta supportläge
              </button>
            </form>
          </Container>
        </div>
      ) : null}

      <div className="border-b border-border bg-surface">
        <Container className="pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            Adminpanel · Styrelsen
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">
            {user.fullName}
          </h1>
          <div className="mt-4">
            <SubNav items={adminNav} label="Adminmeny" />
          </div>
        </Container>
      </div>
      <Container className="py-8">{children}</Container>
    </div>
  );
}
