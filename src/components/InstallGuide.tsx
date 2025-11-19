import { useState } from 'react';
import { Monitor, Apple, Smartphone, CheckCircle, Bot } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const InstallGuide = () => {
  const [activeOS, setActiveOS] = useState('windows');

  const installSteps = {
    windows: [
      {
        step: 1,
        title: 'Download the installer',
        description:
          'Click the Windows download button to get the MetaTrader-Bot-Manager-Setup.exe installer file.',
        icon: '📥',
      },
      {
        step: 2,
        title: 'Run the installer',
        description:
          "Double-click the downloaded .exe file and follow the installation wizard. Windows Defender may show a security warning - click 'More info' then 'Run anyway'.",
        icon: '🚀',
      },
      {
        step: 3,
        title: 'Connect your MetaTrader',
        description:
          'Launch the app and connect to your MT4/MT5 terminal. Enter your account credentials and select your Expert Advisors.',
        icon: '🔗',
      },
      {
        step: 4,
        title: 'Start managing bots',
        description:
          'Your trading bots are now visible in the dashboard. Monitor performance, adjust settings, and control strategies remotely!',
        icon: '🤖',
      },
    ],
    macos: [
      {
        step: 1,
        title: 'Download the DMG file',
        description:
          'Click the macOS download button to get the MetaTrader-Bot-Manager.dmg disk image file.',
        icon: '📥',
      },
      {
        step: 2,
        title: 'Install the application',
        description:
          'Open the .dmg file and drag Peaceful Investment to your Applications folder. You may need to allow apps from identified developers in Security & Privacy settings.',
        icon: '📁',
      },
      {
        step: 3,
        title: 'Connect your MetaTrader',
        description:
          'Launch from Applications and connect to your MT4/MT5 terminal. Configure your account and select which Expert Advisors to monitor.',
        icon: '🔗',
      },
      {
        step: 4,
        title: 'Start managing bots',
        description:
          'Access your complete trading dashboard with real-time bot monitoring, performance analytics, and remote control capabilities.',
        icon: '🤖',
      },
    ],
    linux: [
      {
        step: 1,
        title: 'Download the package',
        description:
          'Choose the appropriate package: .deb for Ubuntu/Debian systems or .AppImage for universal Linux compatibility.',
        icon: '📥',
      },
      {
        step: 2,
        title: 'Install the package',
        description:
          "For .deb: 'sudo dpkg -i metatrader-bot-manager.deb' or for .AppImage: make executable with 'chmod +x' and run directly.",
        icon: '💻',
      },
      {
        step: 3,
        title: 'Connect your MetaTrader',
        description:
          'Start the application and establish connection with your MT4/MT5 instance running on Wine or native Linux terminal.',
        icon: '🔗',
      },
      {
        step: 4,
        title: 'Start managing bots',
        description:
          'Configure your trading environment and begin monitoring your automated strategies with full Linux compatibility.',
        icon: '🤖',
      },
    ],
  };

  return (
    <section className='px-6 pt-10 md:pt-12 lg:pt-24'>
      <div className='mx-auto max-w-7xl'>
        {/* Section Header */}
        <div className='mb-16 text-center'>
          <h2 className='mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
            Get Started in{' '}
            <span className='text-[var(--yellowcolor)]'>3 Easy Steps</span>
          </h2>
          <p className='mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl'>
            Setting up Peaceful Investment is quick and straightforward. Follow
            our step-by-step guide to start controlling your trading bots within
            minutes.
          </p>
        </div>

        {/* OS Tabs */}
        <Tabs value={activeOS} onValueChange={setActiveOS} className='w-full'>
          <div className='bg-gradient-pink-to-yellow mb-5 rounded-lg p-[2px] lg:mb-12'>
            <TabsList className='grid w-full grid-cols-3 bg-black'>
              <TabsTrigger value='windows' className='flex items-center gap-2'>
                <Monitor className='h-4 w-4' />
                Windows Setup
              </TabsTrigger>
              <TabsTrigger value='macos' className='flex items-center gap-2'>
                <Apple className='h-4 w-4' />
                macOS Setup
              </TabsTrigger>
              <TabsTrigger value='linux' className='flex items-center gap-2'>
                <Smartphone className='h-4 w-4' />
                Linux Setup
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Installation Steps */}
          {Object.entries(installSteps).map(([os, steps]) => (
            <TabsContent key={os} value={os}>
              <div className='grid grid-cols-1 gap-8 space-y-0 md:grid-cols-2'>
                {steps.map((step, index) => (
                  <div
                    key={step.step}
                    className='glass-card group mt-0 flex items-start gap-6 border-secondary-foreground bg-black'
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Step Number */}
                    <div className='flex-shrink-0'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-white transition-transform group-hover:scale-110'>
                        {step.step}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className='flex-grow'>
                      <div className='mb-2 flex items-center gap-3'>
                        <span className='text-2xl'>{step.icon}</span>
                        <h3 className='font-inter text-lg font-normal text-white'>
                          {step.title}
                        </h3>
                      </div>
                      <p className='font-open-sans text-sm leading-relaxed text-muted-foreground'>
                        {step.description}
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className='flex-shrink-0'>
                      <CheckCircle className='text-accent-green h-6 w-6 opacity-70 transition-opacity group-hover:opacity-100' />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Requirements & Support */}
        <div className='mt-7 grid gap-8 md:mt-12 md:grid-cols-1 lg:mt-16'>
          {/* System Requirements */}

          <div className='border-[0px] bg-transparent p-0'>
            <div className='mb-6 flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary'>
                <Bot className='h-6 w-6 text-white' />
              </div>
              <h3 className='font-inter text-lg font-normal text-white'>
                System Requirements
              </h3>
            </div>

            <div className='grid gap-8 space-y-0 md:grid-cols-3'>
              <div>
                <div className='mb-1 font-semibold text-white'>
                  Minimum Hardware:
                </div>
                <div className='text-muted-foreground'>
                  4GB RAM, 500MB free space, internet connection
                </div>
              </div>
              <div>
                <div className='mb-1 font-semibold text-white'>
                  MetaTrader Compatibility:
                </div>
                <div className='text-muted-foreground'>
                  MT4 Build 1090+, MT5 Build 2155+
                </div>
              </div>
              <div>
                <div className='mb-1 font-semibold text-white'>
                  Network Requirements:
                </div>
                <div className='text-muted-foreground'>
                  Stable internet, ports 443 & 80 open
                </div>
              </div>
            </div>
          </div>

          {/* Support Options */}
          <div className='border-[0px] bg-transparent p-0'>
            <h3 className='mb-4 font-inter text-lg font-bold text-[var(--yellowcolor)]'>
              Need Installation Help?
            </h3>
            <div className='grid gap-8 space-y-0 md:grid-cols-2 xl:grid-cols-4'>
              <div className='bg-gradient-pink-to-yellow rounded-lg p-[2px]'>
                <a
                  href='#'
                  className='flex items-center justify-between rounded-lg border border-secondary-foreground p-3 transition-colors hover:bg-muted/50'
                >
                  <span className='text-white'>
                    📖 Installation Documentation
                  </span>
                  <span className='text-accent-cyan'>→</span>
                </a>
              </div>

              <div className='bg-gradient-pink-to-yellow rounded-lg p-[2px]'>
                <a
                  href='#'
                  className='flex items-center justify-between rounded-lg border border-secondary-foreground p-3 transition-colors hover:bg-muted/50'
                >
                  <span className='text-white'>🎥 Video Setup Tutorial</span>
                  <span className='text-accent-cyan'>→</span>
                </a>
              </div>
              <div className='bg-gradient-pink-to-yellow rounded-lg p-[2px]'>
                <a
                  href='#'
                  className='flex items-center justify-between rounded-lg border border-secondary-foreground p-3 transition-colors hover:bg-muted/50'
                >
                  <span className='text-white'>💬 Live Support Chat</span>
                  <span className='text-accent-green'>●</span>
                </a>
              </div>
              <div className='bg-gradient-pink-to-yellow rounded-lg p-[2px]'>
                <a
                  href='#'
                  className='flex items-center justify-between rounded-lg border border-secondary-foreground p-3 transition-colors hover:bg-muted/50'
                >
                  <span className='text-white'>👥 Community Forum</span>
                  <span className='text-accent-cyan'>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallGuide;
