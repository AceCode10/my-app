import { Metadata } from 'next';
import { Building2, Users, Award, Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us - Our Mission to Transform Exam Preparation',
  description: 'Learn about IGA Prep\'s mission to make quality IGCSE, GCSE & A-Level exam preparation accessible to every student worldwide. Discover our story, values, and the team behind your success.',
  keywords: [
    'about IGA Prep',
    'exam preparation company',
    'IGCSE learning platform',
    'education technology',
    'student success',
    'online learning mission',
  ],
  openGraph: {
    title: 'About IGA Prep - Transforming Exam Preparation',
    description: 'Learn about our mission to make quality exam preparation accessible to every student worldwide.',
    url: 'https://igaprep.com/about',
    type: 'website',
  },
  alternates: {
    canonical: 'https://igaprep.com/about',
  },
};

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            About <span className="text-primary">IGA Prep</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering students worldwide with comprehensive, high-quality revision materials for IGCSE, GCSE & A-Level examinations.
          </p>
        </div>

        {/* Mission Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="flex items-center mb-4">
              <Target className="w-8 h-8 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To provide accessible, comprehensive, and effective learning resources that help students achieve their full potential in international examinations. We believe every student deserves the tools to succeed academically and build confidence for their future.
            </p>
          </div>
          <div>
            <div className="flex items-center mb-4">
              <Award className="w-8 h-8 text-primary mr-3" />
              <h2 className="text-2xl font-bold text-foreground">Our Vision</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To become the global leader in online exam preparation, renowned for our quality content, innovative learning approaches, and unwavering commitment to student success across all major examination boards.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Student-Centered</h3>
              <p className="text-muted-foreground">
                Every decision we make is guided by what's best for our students' learning and success.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Quality Excellence</h3>
              <p className="text-muted-foreground">
                We maintain the highest standards in content creation, accuracy, and educational effectiveness.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Innovation</h3>
              <p className="text-muted-foreground">
                We continuously evolve our platform and methods to incorporate the latest educational research.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-muted/50 rounded-xl p-8 mb-16">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
              <div className="text-muted-foreground">Students Helped</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">1,000+</div>
              <div className="text-muted-foreground">Resources Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">6+</div>
              <div className="text-muted-foreground">Hours Saved Weekly</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Platform Access</div>
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Founded by educators and technology enthusiasts, IGA Prep emerged from a simple observation: students needed better, more accessible revision materials that truly prepared them for international examinations.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              What started as a small collection of study guides has grown into a comprehensive platform serving thousands of students worldwide. Our team of experienced educators, content creators, and developers work tirelessly to ensure every resource meets the highest standards of accuracy and educational value.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Today, we continue to innovate and expand our offerings, always keeping our focus on student success and academic excellence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
