import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const LandingFAQ = () => {
  const faqs = [
    {
      question: "What is the minimum deposit required to start trading?",
      answer: "You can start trading with as little as $100. This allows new investors to test our platform and strategies without significant risk. Our automated systems work effectively even with smaller amounts."
    },
    {
      question: "How does the automated trading system work?",
      answer: "Our AI-powered trading bots use advanced algorithms and machine learning to analyze market conditions, identify opportunities, and execute trades automatically. You can customize risk levels, choose strategies, and monitor performance in real-time."
    },
    {
      question: "Is my money and personal information secure?",
      answer: "Absolutely. We use bank-grade security with 256-bit encryption, multi-factor authentication, and cold storage for funds. We're fully regulated and comply with international financial security standards including SOC 2 and GDPR."
    },
    {
      question: "Can I withdraw my funds at any time?",
      answer: "Yes, you have full control over your funds and can withdraw them at any time. Most withdrawals are processed within 24 hours, and we don't charge any withdrawal fees for standard bank transfers."
    },
    {
      question: "What markets and instruments can I trade?",
      answer: "Our platform supports forex, stocks, commodities, cryptocurrencies, and indices. We offer access to major global markets including NYSE, NASDAQ, LSE, and leading crypto exchanges."
    },
    {
      question: "Do you provide educational resources for beginners?",
      answer: "Yes, we offer comprehensive educational materials including video courses, webinars, strategy guides, and market analysis. Our community forum also provides opportunities to learn from experienced traders."
    },
    {
      question: "How much can I expect to earn?",
      answer: "Returns vary based on market conditions, chosen strategies, and risk settings. While we cannot guarantee profits, our historical data shows average annual returns of 15-25% for balanced portfolios. Past performance doesn't guarantee future results."
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes, we offer a 30-day free trial with $10,000 in virtual funds to test our platform and strategies. You can explore all features risk-free before making any financial commitment."
    }
  ];

  return (
    <section className="py-24 px-6 bg-muted/50">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Get answers to the most common questions about our trading platform.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="glass-card">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center glass-card">
          <h3 className="text-xl font-bold text-foreground mb-4">
            Still Have Questions?
          </h3>
          <p className="text-muted-foreground mb-6">
            Our expert support team is available 24/7 to help you get started.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Live Chat Support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Email Support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Phone Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;