export const PrivacyPage = ({ onBack }: { onBack: () => void }) => {
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

        <h1 className="font-headline text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-on-surface-variant mb-12">Last updated: March 26, 2026</p>

        <div className="flex flex-col gap-10 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly, including your name, email address, and profile information when you create an account or sign in with Google. We also collect content you create within Zupiq such as study materials, flashcards, and session history.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the Zupiq service, personalize your learning experience using AI, send you service-related communications, and ensure the security of your account.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">3. Data Storage</h2>
            <p>Your data is stored securely using Supabase infrastructure. We retain your data for as long as your account is active. You may request deletion of your data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">4. Third-Party Services</h2>
            <p>Zupiq uses Google Sign-In for authentication, Supabase for data storage, and Google Gemini AI for generating learning content. These services have their own privacy policies which govern their use of your data.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">5. Cookies</h2>
            <p>We use local storage and session tokens to keep you signed in and remember your preferences. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You may also request a copy of your data or withdraw consent at any time by contacting us at <a href="mailto:privacy@zupiq.ai" className="text-primary hover:underline">privacy@zupiq.ai</a>.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-on-surface mb-3">8. Contact</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@zupiq.ai" className="text-primary hover:underline">privacy@zupiq.ai</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
