import { Github, ExternalLink } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Leaderboard", href: "/leaderboard" },
  ],
  resources: [
    { label: "Documentation", href: "https://soroban.stellar.org", external: true },
    { label: "Stellar Network", href: "https://stellar.org", external: true },
    { label: "Soroban Docs", href: "https://soroban.stellar.org/docs", external: true },
  ],
  community: [
    { label: "GitHub", href: "https://github.com/Ada-Girly881/AutoMint", external: true },
    { label: "Discord", href: "#", external: true },
  ],
};

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1 text-sm text-text/70 hover:text-text transition-colors"
            >
              {link.label}
              {link.external && <ExternalLink className="h-3 w-3" />}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-liner bg-card">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-lg font-bold text-text">AutoMint</p>
            <p className="mt-2 text-sm text-muted">
              Mint, earn, and trade AI bot NFTs on Stellar.
            </p>
          </div>

          <FooterLinkGroup title="Product" links={footerLinks.product} />
          <FooterLinkGroup title="Resources" links={footerLinks.resources} />
          <FooterLinkGroup title="Community" links={footerLinks.community} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-liner pt-6 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} AutoMint. All rights reserved.
          </p>

          <div className="flex items-center gap-1 text-xs text-muted">
            <span>Built on</span>
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue hover:underline"
            >
              Stellar
            </a>
            <span>+</span>
            <a
              href="https://soroban.stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-purple hover:underline"
            >
              Soroban
            </a>
            <span className="mx-1">&middot;</span>
            <span>React</span>
            <span>+</span>
            <span>Next.js</span>
            <span>+</span>
            <span>Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
