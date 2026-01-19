import { Metadata } from 'next';
import { FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - User Agreement & Guidelines',
  description: 'Read IGA Prep\'s Terms of Service. Understand the rules, guidelines, and user agreement for using our educational platform.',
  openGraph: {
    title: 'Terms of Service - IGA Prep',
    description: 'Rules and guidelines for using our educational platform.',
    url: 'https://igaprep.com/terms',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Terms of <span className="text-primary">Service</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Please read these terms carefully before using IGA Prep's educational platform and services.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Agreement */}
          <section>
            <div className="flex items-center mb-4">
              <FileText className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Agreement to Terms</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using IGA Prep ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service. These Terms apply to all users of the Service, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              IGA Prep provides educational resources and tools for students preparing for IGCSE, GCSE, and A-Level examinations. Our services include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access to topical questions and past papers</li>
              <li>Revision notes and study materials</li>
              <li>Interactive quizzes and practice tests</li>
              <li>Progress tracking and performance analytics</li>
              <li>Personalized learning recommendations</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">User Accounts</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Creation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Security</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You are responsible for safeguarding the password and all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Termination</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion.
                </p>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <div className="flex items-center mb-4">
              <CheckCircle className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Acceptable Use</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Permitted Use</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You may use our Service for lawful educational purposes in accordance with these Terms. This includes personal study, classroom use (with appropriate licensing), and legitimate academic research.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Prohibited Activities</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  You agree NOT to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Copy, redistribute, or sell our content without permission</li>
                  <li>Share account credentials with others</li>
                  <li>Use automated tools to scrape or download content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Use the Service for any illegal or harmful purposes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All content, features, and functionality of the Service are owned by IGA Prep and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You may not modify, reproduce, distribute, create derivative works, or publicly display our content</li>
              <li>Downloading or copying content for personal use is permitted within reasonable limits</li>
              <li>Teachers may use content in their classrooms with appropriate licensing</li>
              <li>All trademarks, service marks, and trade names are the property of IGA Prep</li>
            </ul>
          </section>

          {/* Subscription and Payment */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Subscription and Payment</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Subscription Plans</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We offer various subscription plans with different features and access levels. Subscription fees are charged in advance on a recurring basis (monthly or annually).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Payment Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All payments are processed securely through third-party payment processors. You agree to provide accurate payment information and authorize us to charge the selected payment method.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Refunds</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We offer a 30-day money-back guarantee for new subscriptions. After this period, refunds are provided at our discretion and may be prorated for unused service time.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cancellation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing period, and you will retain access until that time.
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Disclaimer</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The information and materials provided on IGA Prep are for educational purposes only. While we strive for accuracy, we cannot guarantee that all content is error-free or that it will lead to specific academic results.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>We are not responsible for exam outcomes or academic performance</li>
              <li>Content may be updated or modified without notice</li>
              <li>We recommend supplementing our materials with official exam board resources</li>
              <li>Use of our Service does not guarantee exam success</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, IGA Prep shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be interpreted and governed by the laws of the United Kingdom, without regard to conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of England and Wales.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after any changes constitutes acceptance of the new Terms. We will notify users of significant changes via email or platform notifications.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
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
