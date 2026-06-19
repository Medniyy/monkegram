import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | MonkeGram",
  description: "Terms governing use of the MonkeGram mobile experience.",
};

export default function TermsOfUse() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10 md:py-16">
      <article className="pixel-border-banana bg-grid p-5 md:p-8">
        <p className="font-[family-name:var(--font-display)] text-banana text-[10px]">
          MONKEGRAM
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-cream text-xl md:text-3xl leading-relaxed mt-4">
          TERMS OF USE
        </h1>
        <p className="text-cream/55 text-lg mt-2">Last updated: June 19, 2026</p>

        <div className="mt-8 space-y-8 text-cream/80 text-xl leading-relaxed">
          <Section title="ACCEPTANCE">
            By installing or using MonkeGram, you agree to these Terms. If you
            do not agree, do not use the app.
          </Section>

          <Section title="NOT AFFILIATED — A COMMUNITY PROJECT">
            MonkeGram is an independent, fan-made project — created by Solana
            Monkey Business Gen3 holders (SMB Gen3 #12677 and #4076) as a
            community contribution, and built for the Solana Seeker. It is not
            affiliated with, endorsed by, sponsored by,
            or officially connected to Solana Monkey Business (SMB), MonkeDAO, or
            the creators, contributors, or holders of those collections. All
            Solana Monkey Business names, logos, NFT artwork, and related
            trademarks are the property of their respective owners, and every
            right to that artwork remains fully with them. MonkeGram only
            displays publicly available NFT images that you choose to use; it
            claims no ownership of that artwork and grants you no rights to it.
            The app is built and offered in good faith as a free gift to the
            community — it carries no advertising, sells nothing, has no in-app
            purchases, and does not monetize you or your data. Any rights holder
            who would like a change or removal can reach us at the email below.
          </Section>

          <Section title="THE SERVICE">
            MonkeGram lets you connect a compatible Solana wallet, select a
            public Solana Monkey Business image, apply it as a live camera
            effect, record a clip, share it, and save it locally. Features may
            change, pause, or be discontinued.
          </Section>

          <Section title="WALLET RESPONSIBILITY">
            You are responsible for your wallet, device, credentials, and
            approvals. MonkeGram never asks for your seed phrase. Wallet sign-in
            is an authentication request and is not a promise of access to any
            token, reward, financial return, or transaction.
          </Section>

          <Section title="YOUR CONTENT AND CONDUCT">
            You retain responsibility for clips you create or share. You must
            have the rights and permissions needed for the people, audio,
            images, trademarks, and other material in your clip. Do not use
            MonkeGram for unlawful, deceptive, abusive, infringing, or harmful
            content.
          </Section>

          <Section title="INTELLECTUAL PROPERTY">
            MonkeGram&apos;s original software, interface, and branding are
            protected by applicable intellectual-property laws. Solana, Solana
            Mobile, X, Solana Monkey Business, and other third-party names,
            images, and marks belong to their respective owners. MonkeGram does
            not grant ownership of third-party NFT artwork.
          </Section>

          <Section title="THIRD-PARTY SERVICES">
            Wallet apps, blockchain infrastructure, content gateways, GitHub
            Pages, Android sharing, X, and other destinations are independent
            services governed by their own terms. MonkeGram is not responsible
            for their availability, content, security, or actions.
          </Section>

          <Section title="NO FINANCIAL SERVICE">
            MonkeGram is a creative recording tool. It is not a wallet,
            exchange, broker, investment product, or financial adviser. Nothing
            in the app is financial advice or a guarantee of token value.
          </Section>

          <Section title="DISCLAIMER">
            MonkeGram is provided &quot;as is&quot; and &quot;as
            available.&quot; To the maximum extent permitted by law, we disclaim
            warranties of merchantability, fitness for a particular purpose,
            non-infringement, uninterrupted operation, and error-free results.
          </Section>

          <Section title="LIMITATION OF LIABILITY">
            To the maximum extent permitted by law, MonkeGram&apos;s operator
            will not be liable for indirect, incidental, special,
            consequential, or punitive damages, or for loss of content, wallet
            access, digital assets, data, profits, or opportunities arising from
            use of the app or third-party services.
          </Section>

          <Section title="CHANGES AND CONTACT">
            We may update these Terms as the app changes. Continued use after an
            update means you accept the revised Terms. Questions can be sent to{" "}
            <a className="text-banana underline" href="mailto:athmedia21@gmail.com">
              athmedia21@gmail.com
            </a>
            .
          </Section>
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-display)] text-banana text-[11px] leading-relaxed mb-2">
        {title}
      </h2>
      <p>{children}</p>
    </section>
  );
}
