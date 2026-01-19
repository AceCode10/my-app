
'use client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
    {
        question: "What exam boards and qualifications do you support?",
        answer: "We support all major exam boards including Cambridge (CIE), Edexcel, AQA, OCR, IB, and AP. Our resources cover IGCSE, GCSE, AS Level, and A Level qualifications across a wide range of subjects including Mathematics, Sciences, ICT, Business Studies, and more."
    },
    {
        question: "What resources are available on IGAPrep?",
        answer: "We offer comprehensive revision materials including topical questions organized by topic for targeted practice, past papers with mark schemes for exam preparation, detailed revision notes created by experienced educators, and interactive practice sessions with instant feedback."
    },
    {
        question: "How does the AI-powered feedback work?",
        answer: "Our AI assistant, Kodi, analyzes your answers against mark schemes and model answers to provide instant, detailed feedback. It explains not just whether your answer is correct, but why, helping you understand the examiner's expectations and improve your technique."
    },
    {
        question: "Can teachers use IGAPrep for their classes?",
        answer: "Yes! Teachers can create classes, invite students using a unique class code, assign assessments, track student progress, and view detailed analytics. Teachers can also create custom tests and share revision materials with their students."
    },
    {
        question: "Is IGAPrep free to use?",
        answer: "IGAPrep offers a free tier with access to basic resources. Premium plans unlock additional features like unlimited AI explanations, advanced analytics, and full access to all past papers and revision materials. Check our pricing page for more details."
    },
    {
        question: "How do I track my revision progress?",
        answer: "Your dashboard shows your study streaks, completed topics, bookmarked notes, and performance analytics. You can see which topics need more attention and track your improvement over time with detailed statistics."
    },
    {
        question: "Can I use IGAPrep on my mobile device?",
        answer: "Absolutely! IGAPrep is fully responsive and works great on smartphones, tablets, and desktop computers. You can study anywhere, anytime, and your progress syncs across all your devices."
    },
    {
        question: "How often is the content updated?",
        answer: "We regularly update our content to align with the latest syllabus changes and add new past papers as they become available. Our team of educators continuously reviews and improves the revision materials to ensure accuracy and relevance."
    },
];

const FaqPage = () => {
  return (
    <div className="bg-background text-foreground py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">Frequently Asked Questions</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Have questions? We have answers. Find everything you need to know about our platform.</p>
        </div>
        
        <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
                {faqs.map((faq, index) => (
                     <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                            {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground">
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
