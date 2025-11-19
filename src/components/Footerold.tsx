import { Mail, Bot } from 'lucide-react';

const Footer = () => {
  return (
    <footer className='bg-secondary px-6 py-8 text-secondary-foreground'>
      <div className='mx-auto max-w-7xl'>
        {/* Minimal Footer Content */}
        <div className='flex flex-col items-center justify-between gap-6 md:flex-row'>
          {/* Brand Section */}
          <div className='flex items-center gap-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary'>
              <Bot className='h-5 w-5 text-white' />
            </div>
            <span className='text-lg font-semibold'>Peaceful Investment</span>
          </div>

          {/* Essential Links */}
          <div className='flex items-center gap-6 text-sm'>
            <a
              href='/about'
              className='text-secondary-foreground/80 transition-colors hover:text-primary'
            >
              About
            </a>
            <a
              href='/contact'
              className='text-secondary-foreground/80 transition-colors hover:text-primary'
            >
              Contact
            </a>
            <a
              href='#'
              className='text-secondary-foreground/80 transition-colors hover:text-primary'
            >
              Privacy
            </a>
            <a
              href='#'
              className='text-secondary-foreground/80 transition-colors hover:text-primary'
            >
              Terms
            </a>
          </div>

          {/* Contact */}
          <div className='flex items-center gap-2 text-sm text-secondary-foreground/80'>
            <Mail className='h-4 w-4' />
            <span>support@peacefulinvestment.com</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='mt-6 border-t border-secondary-foreground/20 pt-6'>
          <div className='text-center text-sm text-secondary-foreground/60'>
            © 2024 Peaceful Investment. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
