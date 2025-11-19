import { Button } from '@/components/ui/button';
import {
  Monitor,
  Smartphone,
  Apple,
  Download,
  FileText,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { useLatestUpdates } from '@/hooks/useLatestUpdates';

const DownloadSection = () => {
  const { windows, android, ios, loading, error } = useLatestUpdates();

  const handleDownload = (platform: string, downloadUrl?: string) => {
    if (platform === 'iOS') {
      // For iOS, redirect to App Store or show a message
      window.open('https://apps.apple.com/app/peaceful-investment', '_blank');
      console.log(`Redirecting to App Store for ${platform}`);
      return;
    }

    if (!downloadUrl) {
      console.error(`No download URL available for ${platform}`);
      return;
    }

    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = '';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Downloading Peaceful Investment for ${platform}`);
  };

  // Create download cards data
  const downloads = [
    {
      os: 'Windows',
      icon: Monitor,
      version: windows?.version || 'Loading...',
      size: '~50 MB', // Placeholder size
      requirements: 'Windows 10 or later',
      downloadUrl: windows?.downloadUrl,
      badge: 'Most Popular',
      loading: loading,
      available: !!windows,
    },
    {
      os: 'Android',
      icon: Smartphone,
      version: android?.version || 'Loading...',
      size: '~25 MB', // Placeholder size
      requirements: 'Android 8.0 or later',
      downloadUrl: android?.downloadUrl,
      badge: null,
      loading: loading,
      available: !!android,
    },
    {
      os: 'iOS',
      icon: Apple,
      version: ios?.version || 'Loading...',
      size: '~30 MB', // Placeholder size
      requirements: 'iOS 12.0 or later',
      downloadUrl: ios?.downloadUrl,
      badge: 'App Store',
      loading: loading,
      available: !!ios,
    },
  ];

  if (error) {
    return (
      <section className='px-6 pt-10 md:pt-12 lg:pt-24'>
        <div className='mx-auto max-w-7xl text-center'>
          <div className='glass-card bg-black'>
            <h3 className='mb-4 font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
              Unable to Load{' '}
              <span className='text-[var(--yellowcolor)]'>Downloads</span>
            </h3>
            <p className='mb-4 font-open-sans text-lg text-white lg:text-xl'>
              {error}
            </p>
            <span className='bg-gradient-pink-to-yellow inline-block rounded-[12px] p-[2px]'>
              <Button
                onClick={() => window.location.reload()}
                className='bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block h-[35px] rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white'
              >
                Try Again
              </Button>
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='px-6 pt-10 md:pt-12 lg:pt-24'>
      <div className='mx-auto max-w-7xl pb-10 md:pb-12 lg:pb-24'>
        <div className='animate-slide-up' style={{ animationDelay: '0.4s' }}>
          <div className='bg-gradient-pink-to-yellow rounded-sm p-[2px]'>
            <div className='grid grid-cols-1 items-center gap-6 rounded-sm bg-black md:grid-cols-2 lg:grid-cols-4'>
              <div className='glass-card border-0 bg-transparent py-9 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[50px] font-normal leading-[36px] text-white'>
                  50K+
                </div>
                <div className='font-open-sans text-2xl font-normal text-white'>
                  Active Traders
                </div>
              </div>
              <div className='glass-card border-0 bg-transparent py-9 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[50px] font-normal leading-[36px] text-white'>
                  $2.8B+
                </div>
                <div className='font-open-sans text-2xl font-normal text-white'>
                  Volume Managed
                </div>
              </div>
              <div className='glass-card border-0 bg-transparent py-9 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[50px] font-normal leading-[36px] text-white'>
                  99.9%
                </div>
                <div className='font-open-sans text-2xl font-normal text-white'>
                  Uptime
                </div>
              </div>
              <div className='glass-card border-0 bg-transparent py-9 text-center shadow-none'>
                <div className='mb-2 font-bebas-neue text-[50px] font-normal leading-[36px] text-white'>
                  24/7
                </div>
                <div className='font-open-sans text-2xl font-normal text-white'>
                  Monitoring
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-7xl'>
        {/* Section Header */}
        <div className='mb-16 text-center'>
          <h2 className='mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl'>
            Download the App for{' '}
            <span className='text-[var(--yellowcolor)]'>Your Platform</span>
          </h2>
          <p className='mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl'>
            Get started with Peaceful Investment on your preferred platform. All
            platforms receive simultaneous updates and feature parity.
          </p>
        </div>

        {/* Download Cards */}
        <div className='mx-auto mb-16 grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3'>
          {downloads.map((download, index) => (
            <div
              key={download.os}
              className='hover:glow-primary bg-gradient-pink-to-yellow group relative overflow-hidden rounded-lg p-[2px]'
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className='rounded-lg bg-black p-8'>
                {/* Badge */}
                {download.badge && (
                  <div className='bg-gradient-yellow-to-pink absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white'>
                    {download.badge}
                  </div>
                )}

                {/* OS Icon & Title */}
                <div className='mb-6 text-center'>
                  <div className='group-hover:glow-primary mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-black transition-transform duration-300 group-hover:scale-110'>
                    <download.icon className='h-10 w-10 text-white' />
                  </div>
                  <h3 className='font-bebas-neue text-2xl font-normal text-white'>
                    Peaceful Investment
                  </h3>
                  <p className='font-open-sans text-sm text-white'>
                    for {download.os}
                  </p>
                </div>

                {/* Version Info */}
                <div className='mb-8 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='font-open-sans text-sm text-white'>
                      Version:
                    </span>
                    <span className='font-open-sans text-sm font-semibold text-white'>
                      {download.loading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        download.version
                      )}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='font-open-sans text-sm font-semibold text-white'>
                      Size:
                    </span>
                    <span className='font-open-sans text-sm font-semibold text-white'>
                      {download.size}
                    </span>
                  </div>
                  <div className='border-t border-secondary-foreground pt-3 text-center font-open-sans text-sm font-semibold text-white'>
                    Requires: {download.requirements}
                  </div>
                </div>

                {/* Download Button */}
                <Button
                  className='download-btn-primary group/btn mb-4 w-full'
                  onClick={() =>
                    handleDownload(download.os, download.downloadUrl)
                  }
                  disabled={download.loading || !download.available}
                >
                  {download.loading ? (
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                  ) : download.os === 'iOS' ? (
                    <Apple className='mr-2 h-5 w-5 group-hover/btn:animate-bounce' />
                  ) : (
                    <Download className='mr-2 h-5 w-5 group-hover/btn:animate-bounce' />
                  )}
                  {download.loading
                    ? 'Loading...'
                    : download.os === 'iOS'
                      ? `Get on App Store`
                      : `Download for ${download.os}`}
                </Button>

                {/* Secondary Links */}
                <div className='flex justify-between gap-4'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex h-[35px] w-full rounded-[10px] border-0 border-[2px] border-secondary-foreground bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:bg-black hover:text-white'
                  >
                    <FileText className='mr-0 h-4 w-4' />
                    Guide
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex h-[35px] w-full rounded-[10px] border-0 border-[2px] border-secondary-foreground bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:bg-black'
                  >
                    <HelpCircle className='mr-0 h-4 w-4' />
                    Requirements
                  </Button>
                </div>

                {/* Glow effect on hover */}
                <div className='pointer-events-none absolute inset-0 rounded-2xl bg-gradient-primary opacity-0 transition-opacity duration-300 group-hover:opacity-5' />
              </div>
            </div>
          ))}
        </div>

        {/* Additional Options */}
        <div className='text-center'>
          <h3 className='mb-6 text-xl font-semibold text-white'>
            Advanced Installation Options
          </h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
            <span className='bg-gradient-pink-to-yellow w-full rounded-[12px] p-[2px]'>
              <Button
                variant='outline'
                className='hover:bg-gradient-pink-to-yellow flex h-[35px] w-full rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
              >
                📦 Portable Version
              </Button>
            </span>

            <span className='bg-gradient-pink-to-yellow w-full rounded-[12px] p-[2px]'>
              <Button
                variant='outline'
                className='hover:bg-gradient-pink-to-yellow flex h-[35px] w-full rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
              >
                🔧 Beta Releases
              </Button>
            </span>

            <span className='bg-gradient-pink-to-yellow w-full rounded-[12px] p-[2px]'>
              <Button
                variant='outline'
                className='hover:bg-gradient-pink-to-yellow flex h-[35px] w-full rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
              >
                📜 Previous Versions
              </Button>
            </span>

            <span className='bg-gradient-pink-to-yellow w-full rounded-[12px] p-[2px]'>
              <Button
                variant='outline'
                className='hover:bg-gradient-pink-to-yellow flex h-[35px] w-full rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white'
              >
                🛠️ Source Code
              </Button>
            </span>
          </div>

          {/* Trust Badges */}
          <div className='mt-8 flex flex-wrap justify-center gap-6 border-t border-secondary-foreground pt-6'>
            <div className='flex items-center gap-2 text-sm text-white'>
              {/* <div className="w-3 h-3 bg-accent-green rounded-full"></div> */}
              <span>Digitally Signed</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-white'>
              {/* <div className="w-3 h-3 bg-accent-cyan rounded-full"></div> */}
              <span>Virus Scanned</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-white'>
              {/* <div className="w-3 h-3 bg-accent-green rounded-full"></div> */}
              <span>SSL Download</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-white'>
              {/* <div className="w-3 h-3 bg-accent-cyan rounded-full"></div> */}
              <span>Auto-Updates</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadSection;
