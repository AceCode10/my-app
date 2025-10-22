
'use client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
    {
        question: "Is this platform suitable for all Cambridge IGCSE subjects?",
        answer: "We are continuously adding more subjects. Our initial launch focuses on key subjects like Maths, ICT, and the Sciences, but our goal is to cover the entire Cambridge IGCSE curriculum. Check our subjects section for the most up-to-date list."
    },
    {
        question: "How does the AI marking and coaching work?",
        answer: "Our AI coach, Kodi, uses advanced generative models to analyze your text-based answers. It compares your response against key concepts and the model answer to provide instant, constructive feedback, helping you understand not just what you got wrong, but why."
    },
    {
        question: "Can teachers use this platform?",
        answer: "Absolutely! We have a dedicated Teacher Plan that allows educators to create classes, manage students, schedule assessments, and view detailed performance analytics for their entire class."
    },
    {
        question: "What's the difference between the 'Essential' and 'Pro' plans?",
        answer: "The 'Essential' plan is perfect for dedicated students, offering unlimited flashcards and quizzes. The 'Pro' plan is for high achievers, adding features like timed full-paper assessments, a mistake tracker to focus on weak areas, and unlimited AI-powered explanations and model answers."
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
