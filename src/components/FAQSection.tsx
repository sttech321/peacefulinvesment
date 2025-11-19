import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQSection = () => {
  const faqs = [
    {
      question: 'Does it work with both MT4 and MT5?',
      answer:
        'Yes! Peaceful Investment supports both MetaTrader 4 and MetaTrader 5 platforms. It automatically detects your terminal version and adapts the interface accordingly. You can manage Expert Advisors, custom indicators, and trading signals from both platforms simultaneously.',
    },
    {
      question: 'Is my trading data safe and secure?',
      answer:
        'Absolutely. We use bank-grade AES-256 encryption to protect all your trading data and account information. Your MetaTrader credentials are encrypted locally and never stored on our servers. All data transmission uses secure SSL protocols, and we comply with financial industry security standards.',
    },
    {
      question: 'Can I manage multiple MT accounts from one app?',
      answer:
        'Yes, you can connect and manage multiple MetaTrader accounts from different brokers within a single dashboard. The app supports unlimited account connections and provides consolidated reporting across all your trading accounts, making portfolio management effortless.',
    },
    {
      question: 'Do I need a VPS to use this app?',
      answer:
        "No, a VPS is not required, but it's recommended for 24/7 trading. The app works perfectly with MetaTrader running on your local computer, VPS, or cloud server. For uninterrupted trading, many users prefer running MT4/MT5 on a VPS while controlling it remotely through our app.",
    },
    {
      question: 'How do alerts and notifications work?',
      answer:
        'Our smart alert system monitors your bots in real-time and sends instant notifications via push notifications, email, or SMS. You can customize alerts for trade openings/closings, profit targets, stop losses, connection issues, and custom performance thresholds.',
    },
    {
      question: 'What happens if my internet connection drops?',
      answer:
        'Your MetaTrader bots will continue running independently on your terminal or VPS. The app will automatically reconnect when your internet is restored and sync all missed data. For maximum reliability, we recommend running MT4/MT5 on a stable VPS connection.',
    },
    {
      question: 'Can I modify EA settings remotely?',
      answer:
        'Yes, you can adjust most Expert Advisor parameters remotely, including lot sizes, risk levels, and trading hours. However, some complex settings may require direct access to your MetaTrader terminal. The app clearly indicates which parameters can be modified remotely.',
    },
    {
      question: 'Is there a mobile version available?',
      answer:
        "The current desktop application is optimized for mobile browsers and tablets, providing full functionality on any device. We're developing dedicated mobile apps for iOS and Android, which will be available in Q2 2024 with additional mobile-specific features.",
    },
  ];

  return (
    <section className='px-6 py-10 md:py-12 lg:py-24'>
      <div className='mx-auto max-w-4xl'>
        {/* Section Header */}
        <div className='mb-16 text-center'>
          <h2 className='mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
            Frequently Asked{' '}
            <span className='text-[var(--yellowcolor)]'>Questions</span>
          </h2>
          <p className='mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl'>
            Get answers to common questions about Peaceful Investment. Our
            comprehensive FAQ covers setup, security, functionality, and best
            practices.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className='glass-card'>
          <Accordion type='single' collapsible className='w-full'>
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className='border-border/50'
              >
                <AccordionTrigger className='hover:text-accent-cyan text-left text-lg font-semibold text-foreground transition-colors'>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className='pb-6 pt-2 leading-relaxed text-muted-foreground'>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Support Resources */}
        <div className='mt-16 grid gap-8 md:grid-cols-2'>
          <div className='glass-card text-center'>
            <div className='mb-4 text-4xl'>📚</div>
            <h3 className='mb-4 text-xl font-semibold text-foreground'>
              Documentation & Guides
            </h3>
            <p className='mb-6 text-muted-foreground'>
              Comprehensive documentation, video tutorials, and step-by-step
              guides for all features.
            </p>
            <a
              href='#'
              className='download-btn-secondary inline-flex items-center justify-center'
            >
              Browse Documentation
            </a>
          </div>

          <div className='glass-card text-center'>
            <div className='mb-4 text-4xl'>💬</div>
            <h3 className='mb-4 text-xl font-semibold text-foreground'>
              24/7 Support & Community
            </h3>
            <p className='mb-6 text-muted-foreground'>
              Join our active trader community and get help from experts and
              fellow users.
            </p>
            <div className='flex justify-center gap-3'>
              <a
                href='#'
                className='download-btn-primary inline-flex items-center justify-center px-4 text-sm'
              >
                Live Chat
              </a>
              <a
                href='#'
                className='download-btn-secondary inline-flex items-center justify-center px-4 text-sm'
              >
                Community
              </a>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className='glass-card mt-16 text-center'>
          <h3 className='mb-4 text-xl font-semibold text-foreground'>
            Still have questions about Peaceful Investment?
          </h3>
          <p className='mb-6 text-muted-foreground'>
            Our trading experts are here to help you optimize your automated
            trading setup.
          </p>
          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <a
              href='#'
              className='download-btn-primary inline-flex items-center justify-center'
            >
              💬 Chat with Trading Expert
            </a>
            <a
              href='#'
              className='download-btn-secondary inline-flex items-center justify-center'
            >
              📧 Email Support
            </a>
            <a
              href='#'
              className='download-btn-secondary inline-flex items-center justify-center'
            >
              📞 Schedule Call
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
