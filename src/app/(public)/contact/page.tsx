import { Metadata } from 'next';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us - IGA Prep',
  description: 'Get in touch with the IGA Prep team for support, feedback, or inquiries.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Contact <span className="text-primary">IGA Prep</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're here to help! Reach out to us with any questions, feedback, or support needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-8">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email Us</h3>
                  <p className="text-muted-foreground mb-2">Send us an email anytime</p>
                  <a href="mailto:support@igaprep.com" className="text-primary hover:underline">
                    support@igaprep.com
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Call Us</h3>
                  <p className="text-muted-foreground mb-2">Mon-Fri from 9am to 6pm GMT</p>
                  <a href="tel:+4402081234567" className="text-primary hover:underline">
                    +260 960 667093
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Visit Us</h3>
                  <p className="text-muted-foreground">
                    32 Cairo Road,<br />
                    Lusaka, Zambia.<br />
                  </p>
                </div>
              </div>
            </div>

            {/* Support Hours */}
            <div className="mt-12 p-6 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-foreground mb-4">Support Hours</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monday - Friday</span>
                  <span className="text-foreground">9:00 AM - 6:00 PM GMT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saturday</span>
                  <span className="text-foreground">10:00 AM - 4:00 PM GMT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sunday</span>
                  <span className="text-foreground">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-8">Send us a Message</h2>
            
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a subject</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="feedback">Feedback & Suggestions</option>
                  <option value="partnership">Partnership Opportunities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                <Send className="w-5 h-5 mr-2" />
                Send Message
              </button>
            </form>

            <p className="text-sm text-muted-foreground mt-4 text-center">
              We'll respond to your inquiry within 24-48 hours.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-6">Before You Contact Us</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Many common questions are answered in our FAQ. Check there first for quick answers to frequently asked questions.
          </p>
          <a
            href="/faq"
            className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Visit FAQ
          </a>
        </div>
      </div>
    </div>
  );
}
