export const TermsPage = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-8 py-16">
        <button
          onClick={onBack}
          className="text-on-surface-variant hover:text-on-surface transition-colors mb-12 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        <h1 className="font-headline text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-on-surface-variant mb-12">Last updated: March 26, 2026</p>

        <div className="flex flex-col gap-10 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Zupiq ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">2. Use of the Service</h2>
            <p>You may use Zupiq for personal, non-commercial educational purposes. You agree not to misuse the Service, attempt to access it in unauthorized ways, or use it to violate any applicable laws or regulations.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">3. Account Responsibility</h2>
            <p>You are responsible for maintaining the security of your account and all activity that occurs under it. You must notify us immediately of any unauthorized use of your account at <a href="mailto:support@zupiq.ai" className="text-primary hover:underline">support@zupiq.ai</a>.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">4. User Content</h2>
            <p>You retain ownership of any content you create within Zupiq. By using the Service, you grant us a limited license to process and store your content solely for the purpose of providing the Service to you.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">5. AI-Generated Content</h2>
            <p>Zupiq uses AI to generate study materials and learning content. AI-generated content may contain inaccuracies. You should verify important information from authoritative sources before relying on it.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">6. Intellectual Property</h2>
            <p>The Zupiq name, logo, and all related software, design, and content are the property of Zupiq and are protected by applicable intellectual property laws. You may not copy, modify, or distribute them without our written permission.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">7. Termination</h2>
            <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time from the Settings page.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">8. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or meet your specific requirements.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Zupiq shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">11. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:support@zupiq.ai" className="text-primary hover:underline">support@zupiq.ai</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
