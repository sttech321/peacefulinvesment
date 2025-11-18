import { Mail, Bot } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Minimal Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Section */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold">Peaceful Investment</span>
          </div>

          {/* Essential Links */}
          <div className="flex items-center gap-6 text-sm">
            <a 
              href="/about"
              className="text-secondary-foreground/80 hover:text-primary transition-colors"
            >
              About
            </a>
            <a 
              href="/contact"
              className="text-secondary-foreground/80 hover:text-primary transition-colors"
            >
              Contact
            </a>
            <a 
              href="#"
              className="text-secondary-foreground/80 hover:text-primary transition-colors"
            >
              Privacy
            </a>
            <a 
              href="#"
              className="text-secondary-foreground/80 hover:text-primary transition-colors"
            >
              Terms
            </a>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-2 text-sm text-secondary-foreground/80">
            <Mail className="w-4 h-4" />
            <span>support@peacefulinvestment.com</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-secondary-foreground/20 pt-6 mt-6">
          <div className="text-center text-sm text-secondary-foreground/60">
            © 2024 Peaceful Investment. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;