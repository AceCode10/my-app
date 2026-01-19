import Script from 'next/script';

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  const jsonLdString = JSON.stringify(data);

  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString }}
      strategy="afterInteractive"
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'IGA Prep',
    url: 'https://igaprep.com',
    logo: 'https://igaprep.com/logo.png',
    description: 'Master your IGCSE, GCSE & A-Level exams with smart study tools, topical questions, past papers, revision notes, and personalized learning.',
    sameAs: [
      'https://twitter.com/igaprep',
      'https://facebook.com/igaprep',
      'https://instagram.com/igaprep',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+260-960-667093',
      contactType: 'customer service',
      email: 'support@igaprep.com',
      availableLanguage: 'English',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '32 Cairo Road',
      addressLocality: 'Lusaka',
      addressCountry: 'ZM',
    },
  };

  return <JsonLd data={data} />;
}

export function WebsiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'IGA Prep',
    url: 'https://igaprep.com',
    description: 'Master your IGCSE, GCSE & A-Level exams with smart study tools, topical questions, past papers, revision notes, and personalized learning.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://igaprep.com/resources?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <JsonLd data={data} />;
}

interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}

interface FAQJsonLdProps {
  faqs: { question: string; answer: string }[];
}

export function FAQJsonLd({ faqs }: FAQJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}

interface CourseJsonLdProps {
  name: string;
  description: string;
  subject: string;
  level: string;
  url: string;
}

export function CourseJsonLd({ name, description, subject, level, url }: CourseJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url,
    provider: {
      '@type': 'Organization',
      name: 'IGA Prep',
      url: 'https://igaprep.com',
    },
    educationalLevel: level,
    about: {
      '@type': 'Thing',
      name: subject,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT1H',
    },
  };

  return <JsonLd data={data} />;
}

interface ProductJsonLdProps {
  name: string;
  description: string;
  price: number;
  currency?: string;
}

export function ProductJsonLd({ name, description, price, currency = 'USD' }: ProductJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    brand: {
      '@type': 'Brand',
      name: 'IGA Prep',
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'IGA Prep',
      },
    },
  };

  return <JsonLd data={data} />;
}

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}

export function ArticleJsonLd({ title, description, url, datePublished, dateModified, image }: ArticleJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Organization',
      name: 'IGA Prep',
      url: 'https://igaprep.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'IGA Prep',
      url: 'https://igaprep.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://igaprep.com/logo.png',
      },
    },
    image: image || 'https://igaprep.com/og-image.png',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return <JsonLd data={data} />;
}

export function SoftwareApplicationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'IGA Prep',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };

  return <JsonLd data={data} />;
}
