import { Metadata } from 'next';
import { Shield, Eye, Lock, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - Data Protection & Your Rights',
  description: 'Learn how IGA Prep collects, uses, and protects your personal information. We are committed to safeguarding your privacy and data security.',
  openGraph: {
    title: 'Privacy Policy - IGA Prep',
    description: 'How we collect, use, and protect your personal information.',
    url: 'https://igaprep.com/privacy',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your privacy is important to us. Learn how we collect, use, and protect your personal information.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Introduction */}
          <section>
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Introduction</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              IGA Prep ("we," "our," or "us") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use our educational platform and services. By using IGA Prep, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center mb-4">
              <Database className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Information We Collect</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Name and contact details (email, phone)</li>
                  <li>Account credentials (username, password)</li>
                  <li>Educational information (school, grade level)</li>
                  <li>Payment information (processed securely by third parties)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Usage Data</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Pages visited and time spent on our platform</li>
                  <li>Study progress and quiz performance</li>
                  <li>Resource downloads and interactions</li>
                  <li>Technical information (browser, device, IP address)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cookies and Tracking</h3>
                <p className="text-muted-foreground">
                  We use cookies and similar technologies to enhance your experience, remember preferences, and analyze platform usage. You can control cookie settings through your browser.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center mb-4">
              <Eye className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">How We Use Your Information</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Service Provision</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Deliver educational content and personalized learning experiences</li>
                  <li>Track progress and provide recommendationsthrough your account</li>
                  <li>Provide customer support and respond to inquiries</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Platform Improvement</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Analyze usage patterns to improve our services</li>
                  <li>Develop new features and educational content</li>
                  <li>Conduct research to enhance learning outcomes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Communication</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Send important account notifications</li>
                  <li>Share educational updates and new features</li>
                  <li>Provide customer support responses</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-center mb-4">
              <Lock className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Data Protection and Security</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement robust security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>SSL encryption for all data transmissions</li>
              <li>Secure servers with limited access</li>
              <li>Regular security audits and updates</li>
              <li>Compliance with GDPR and other data protection regulations</li>
              <li>Employee training on data privacy and security</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request removal of your personal data</li>
              <li><strong>Portability:</strong> Transfer your data to another service</li>
              <li><strong>Objection:</strong> Object to certain data processing activities</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share information with trusted third parties for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Payment processing (Stripe, Flutterwave)</li>
              <li>Analytics and performance monitoring</li>
              <li>Customer support platforms</li>
              <li>Cloud hosting and data storage</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All third parties are contractually obligated to protect your data and use it only for specified purposes.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are designed for students of all ages. For users under 13, we require parental consent for account creation and data collection. Parents can review, modify, or delete their child's information at any time by contacting us.
            </p>
          </section>

          {/* Policy Updates */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Policy Updates</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify users of significant changes via email or prominent platform notices. Your continued use of our services after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about this Privacy Policy or need to exercise your data rights, please contact us:
            </p>
            <div className="bg-muted/50 p-6 rounded-lg">
              <p className="text-muted-foreground">
                <strong>Email:</strong> support@igaprep.com<br />
                <strong>Address:</strong> 32 Cairo Road, Lusaka, Zambia.<br />
                <strong>Phone:</strong> +260 960 667093
              </p>
            </div>
          </section>

          {/* Last Updated */}
          <section className="text-center pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              Last updated: January 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
