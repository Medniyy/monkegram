import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MonkeGram",
  description: "How MonkeGram handles wallet, camera, microphone, and video data.",
};

export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10 md:py-16">
      <article className="pixel-border-banana bg-grid p-5 md:p-8">
        <p className="font-[family-name:var(--font-display)] text-banana text-[10px]">
          MONKEGRAM
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-cream text-xl md:text-3xl leading-relaxed mt-4">
          PRIVACY POLICY
        </h1>
        <p className="text-cream/55 text-lg mt-2">Last updated: June 19, 2026</p>

        <div className="mt-8 space-y-8 text-cream/80 text-xl leading-relaxed">
          <Section title="OVERVIEW">
            MonkeGram is a camera and recording experience for Solana Monkey
            Business fans. It has no MonkeGram account system, advertising
            network, analytics service, database, or video-upload backend.
          </Section>

          <Section title="AN INDEPENDENT, FAN-MADE PROJECT">
            MonkeGram is an independent community project — made by Solana
            Monkey Business Gen3 holders (SMB Gen3 #12677 and #4076) and built
            for the Solana Seeker. It is not affiliated with, endorsed by, or
            connected to Solana Monkey Business or
            MonkeDAO. All NFT artwork, names, and related trademarks belong to
            their respective owners. The tool is offered in good faith, free of
            charge, with no advertising, no in-app purchases, and no sale of
            your data.
          </Section>

          <Section title="WALLET CONNECTION">
            The Android app asks you to connect a compatible Solana wallet to
            enter. The wallet may provide your public wallet address and a
            signed authentication response through Solana Mobile Wallet
            Adapter. MonkeGram never receives your seed phrase or private keys,
            and connecting does not authorize a token transfer or purchase.
          </Section>

          <Section title="CAMERA, MICROPHONE, AND VIDEO">
            Camera and microphone input is processed on your device to create
            the live face effect and recording. A completed clip is held
            temporarily on your device. It leaves MonkeGram only when you choose
            to share it through Android, post it to X, or save it to your video
            library.
          </Section>

          <Section title="LOCAL DATA">
            The embedded experience may store onboarding status and recently
            selected token numbers in local browser storage on your device.
            MonkeGram does not receive this information.
          </Section>

          <Section title="NETWORK REQUESTS AND THIRD PARTIES">
            The app downloads its interface, public NFT metadata, images, and
            face-tracking files from its static host and public content
            gateways. GitHub Pages, wallet apps, public image gateways, Android
            sharing services, X, and other services you choose may process
            technical information under their own privacy policies.
          </Section>

          <Section title="PERMISSIONS">
            MonkeGram requests camera and microphone access for recording and
            media access when needed to save a clip. You can revoke permissions
            in Android settings. Some features will stop working if required
            permissions are disabled.
          </Section>

          <Section title="DATA RETENTION">
            MonkeGram does not operate a server that stores your wallet
            activity, recordings, camera feed, microphone feed, or selected NFT
            numbers. Temporary files are removed from the app cache after the
            share or save action completes.
          </Section>

          <Section title="CHILDREN">
            MonkeGram is not directed to children under 13 and does not
            knowingly collect personal information from children.
          </Section>

          <Section title="CHANGES AND CONTACT">
            We may update this policy as the app changes. Questions can be sent
            to{" "}
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
