import { useState } from "react";
import { Monitor, Apple, Smartphone, CheckCircle, Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const InstallGuide = () => {
  const [activeOS, setActiveOS] = useState("windows");

  const installSteps = {
    windows: [
      {
        step: 1,
        title: "Download the installer",
        description: "Click the Windows download button to get the MetaTrader-Bot-Manager-Setup.exe installer file.",
        icon: "📥"
      },
      {
        step: 2,
        title: "Run the installer",
        description: "Double-click the downloaded .exe file and follow the installation wizard. Windows Defender may show a security warning - click 'More info' then 'Run anyway'.",
        icon: "🚀"
      },
      {
        step: 3,
        title: "Connect your MetaTrader",
        description: "Launch the app and connect to your MT4/MT5 terminal. Enter your account credentials and select your Expert Advisors.",
        icon: "🔗"
      },
      {
        step: 4,
        title: "Start managing bots",
        description: "Your trading bots are now visible in the dashboard. Monitor performance, adjust settings, and control strategies remotely!",
        icon: "🤖"
      }
    ],
    macos: [
      {
        step: 1,
        title: "Download the DMG file",
        description: "Click the macOS download button to get the MetaTrader-Bot-Manager.dmg disk image file.",
        icon: "📥"
      },
      {
        step: 2,
        title: "Install the application",
        description: "Open the .dmg file and drag Peaceful Investment to your Applications folder. You may need to allow apps from identified developers in Security & Privacy settings.",
        icon: "📁"
      },
      {
        step: 3,
        title: "Connect your MetaTrader",
        description: "Launch from Applications and connect to your MT4/MT5 terminal. Configure your account and select which Expert Advisors to monitor.",
        icon: "🔗"
      },
      {
        step: 4,
        title: "Start managing bots",
        description: "Access your complete trading dashboard with real-time bot monitoring, performance analytics, and remote control capabilities.",
        icon: "🤖"
      }
    ],
    linux: [
      {
        step: 1,
        title: "Download the package",
        description: "Choose the appropriate package: .deb for Ubuntu/Debian systems or .AppImage for universal Linux compatibility.",
        icon: "📥"
      },
      {
        step: 2,
        title: "Install the package",
        description: "For .deb: 'sudo dpkg -i metatrader-bot-manager.deb' or for .AppImage: make executable with 'chmod +x' and run directly.",
        icon: "💻"
      },
      {
        step: 3,
        title: "Connect your MetaTrader",
        description: "Start the application and establish connection with your MT4/MT5 instance running on Wine or native Linux terminal.",
        icon: "🔗"
      },
      {
        step: 4,
        title: "Start managing bots",
        description: "Configure your trading environment and begin monitoring your automated strategies with full Linux compatibility.",
        icon: "🤖"
      }
    ]
  };

  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Get Started in <span className="text-gradient">3 Easy Steps</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Setting up Peaceful Investment is quick and straightforward. 
            Follow our step-by-step guide to start controlling your trading bots within minutes.
          </p>
        </div>

        {/* OS Tabs */}
        <Tabs value={activeOS} onValueChange={setActiveOS} className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-card mb-12">
            <TabsTrigger value="windows" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Windows Setup
            </TabsTrigger>
            <TabsTrigger value="macos" className="flex items-center gap-2">
              <Apple className="w-4 h-4" />
              macOS Setup
            </TabsTrigger>
            <TabsTrigger value="linux" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Linux Setup
            </TabsTrigger>
          </TabsList>

          {/* Installation Steps */}
          {Object.entries(installSteps).map(([os, steps]) => (
            <TabsContent key={os} value={os}>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div 
                    key={step.step}
                    className="glass-card flex items-start gap-6 group hover:glow-primary"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                        {step.step}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{step.icon}</span>
                        <h3 className="text-xl font-semibold text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-accent-green opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Requirements & Support */}
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          {/* System Requirements */}
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">System Requirements</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-semibold text-foreground mb-1">Minimum Hardware:</div>
                <div className="text-muted-foreground">4GB RAM, 500MB free space, internet connection</div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">MetaTrader Compatibility:</div>
                <div className="text-muted-foreground">MT4 Build 1090+, MT5 Build 2155+</div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Network Requirements:</div>
                <div className="text-muted-foreground">Stable internet, ports 443 & 80 open</div>
              </div>
            </div>
          </div>

          {/* Support Options */}
          <div className="glass-card">
            <h3 className="text-xl font-semibold text-foreground mb-6">Need Installation Help?</h3>
            <div className="space-y-4">
              <a 
                href="#" 
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <span className="text-foreground">📖 Installation Documentation</span>
                <span className="text-accent-cyan">→</span>
              </a>
              <a 
                href="#" 
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <span className="text-foreground">🎥 Video Setup Tutorial</span>
                <span className="text-accent-cyan">→</span>
              </a>
              <a 
                href="#" 
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <span className="text-foreground">💬 Live Support Chat</span>
                <span className="text-accent-green">●</span>
              </a>
              <a 
                href="#" 
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <span className="text-foreground">👥 Community Forum</span>
                <span className="text-accent-cyan">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallGuide;