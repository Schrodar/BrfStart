import { Container } from "@/components/ui";
import { SubNav, type SubNavItem } from "@/components/layout/sub-nav";
import { requireAdmin } from "@/lib/auth";

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

  return (
    <div>
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
