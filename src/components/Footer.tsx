import { Link, useLocation } from 'react-router-dom';
import footerLogo from '@/assets/footerLogo.svg';
import logoAnimation from '@/assets/new-logo.gif';
import FiArrowUpRight from '@/assets/linkArrow.svg';

// Side images

import Left03 from '@/assets/left-03.jpg';
import Right03 from '@/assets/right-03.jpg';

const Footer = () => {
  const location = useLocation();
  const isBlogPage = location.pathname === '/blog';

  // 🔥 Dynamic link data
  const footerLinks = [
    { label: 'Contact is email', to: '/#' },
    { label: 'Quick link', to: '/#' },
    { label: 'Home', to: '/' },
    { label: 'About us', to: '/about' },
    { label: 'Download app', to: '/download' },
  ];

  return (
    <footer
      className='border-t bg-[#0A0412] px-6 py-10 text-white'
      style={{ borderColor: 'var(--pinkcolor)' }}
    >
      <div className='flex grid-cols-1 flex-wrap justify-center gap-8 md:grid-cols-2 lg:grid-cols-3 lg:flex-nowrap'>
        {/* Left column images */}

        {isBlogPage && (
          <div className='imgLeft01 max-w-40'>
            <Link
              to='https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Left03} alt='Left 03' />
            </Link>
          </div>
        )}

        {/* Main Footer Content */}

        <div className='mx-auto w-full max-w-7xl'>
          {/* Grid Section */}
          <div className='grid-cols-1 justify-between gap-6 rounded-sm pb-0 md:flex md:grid-cols-2 lg:grid-cols-3 lg:pb-10'>
            {/* Logo & About */}
            <div className='md:max-w-64 lg:max-w-sm'>
              <Link to='/' className='inline-block'>
                <img
                  src={logoAnimation}
                  alt='Footer Logo'
                  className='h-auto w-full max-w-[75px]'
                />
              </Link>

              <h2 className='pt-5 font-inter text-2xl font-bold text-[var(--yellowcolor)]'>
                About Us
              </h2>

              <p className='pt-2 font-open-sans text-sm text-white'>
                We're on a mission to democratize access to professional trading
                tools and create opportunities for financial growth across the
                globe.
              </p>
            </div>

            {/* 🔥 Dynamic Link List with Arrow Icons */}
            <div className='min-w-40 pt-5 lg:pt-9'>
              <ul className='space-y-3'>
                {footerLinks.map((item, index) => (
                  <li key={index} className='flex items-center gap-3'>
                    <img src={FiArrowUpRight} alt='Arrow' />
                    <Link
                      to={item.to}
                      className='text-[15px] font-normal text-white transition-colors hover:text-primary'
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empty Columns (optional) */}
            <div className='min-w-32 pt-5 lg:pt-9'>
              <h2 className='pb-2 font-inter text-[20px] font-bold text-[var(--yellowcolor)]'>
                Support
              </h2>
              <ul className='space-y-3'>
                <li>
                  <Link
                    to='/contact'
                    className='text-[15px] font-normal text-white transition-colors hover:text-primary'
                  >
                    Contact us
                  </Link>
                </li>
                <li className='flex'>
                  <Link to='#' className='mr-3'>
                    <svg
                      width='26'
                      height='25'
                      viewBox='0 0 26 25'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M18.4611 1H6.82037C3.60587 1 1 3.57436 1 6.75V18.25C1 21.4256 3.60587 24 6.82037 24H18.4611C21.6756 24 24.2815 21.4256 24.2815 18.25V6.75C24.2815 3.57436 21.6756 1 18.4611 1Z'
                        stroke='#F3B800'
                        stroke-width='2'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M17.2969 11.7758C17.4406 12.7329 17.2751 13.7104 16.824 14.5692C16.3729 15.428 15.6592 16.1245 14.7844 16.5595C13.9096 16.9945 12.9182 17.1459 11.9512 16.9922C10.9843 16.8385 10.091 16.3874 9.39847 15.7033C8.70594 15.0191 8.24941 14.1367 8.09381 13.1814C7.93821 12.2261 8.09148 11.2467 8.5318 10.3825C8.97213 9.51823 9.67709 8.81315 10.5464 8.36752C11.4157 7.9219 12.4052 7.75842 13.374 7.90035C14.3622 8.04511 15.2771 8.50003 15.9835 9.1979C16.6899 9.89577 17.1504 10.7996 17.2969 11.7758Z'
                        stroke='#F3B800'
                        stroke-width='2'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M19.0425 6.1748H19.0535'
                        stroke='white'
                        stroke-width='2'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                    </svg>
                  </Link>{' '}
                  <Link to='#'>
                    <svg
                      width='15'
                      height='25'
                      viewBox='0 0 15 25'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M13.8088 0.800049H10.2609C8.69264 0.800049 7.18859 1.40585 6.07966 2.48418C4.97072 3.56252 4.34772 5.02505 4.34772 6.55005V10H0.799805V14.6H4.34772V23.8H9.07828V14.6H12.6262L13.8088 10H9.07828V6.55005C9.07828 6.24505 9.20288 5.95254 9.42466 5.73688C9.64645 5.52121 9.94726 5.40005 10.2609 5.40005H13.8088V0.800049Z'
                        stroke='#F3B800'
                        stroke-width='1.6'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  <Link
                    to='#'
                    className='text-[15px] font-normal text-white transition-colors hover:text-primary'
                  >
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right column images */}
        {isBlogPage && (
          <div className='imgRight01 max-w-40'>
            <Link
              to='https://knightsoftheholyrosary.wordpress.com/2012/06/23/the-sacred-heart-of-jesus-the-immaculate-heart-of-mary-and-the-message-of-fatima/'
              target='_blank'
              className='inline-block bg-white p-1'
            >
              <img src={Right03} alt='Right 03' />
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className='mx-auto w-full max-w-7xl pt-6 lg:pt-0'>
        <div className='border-t border-secondary-foreground pt-6'>
          <div className='text-center text-sm text-white'>
            &copy; 2025 Peaceful Investment. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
