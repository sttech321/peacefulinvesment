import React, { PureComponent } from 'react'
import bridgegapimage1 from '@/assets/bridge-gap-image-1.png';
import bridgegapimage2 from '@/assets/bridge-gap-image-3.png';
import bridgegapimage3 from '@/assets/bridge-gap-image-3.png';
import bridgegapimage4 from '@/assets/bridge-gap-image-4.png';



const LandingServicesNew = () => {
  const Servicesfeatures = [
    {
     
      title: "Limited Transparency",
      description: "Many investment options lack clarity on how companies use their profits. This makes it difficult to know if your investments are indirectly supporting activities you oppose.",
    },
    {
     
      title: "Navigating Ethical Complexities",
      description: "Discerning the ethical implications of various industries and companies can be overwhelming. You might need guidance on issues like social justice, environmental impact, and fair labor practices.",
    },
    {
     
      title: "Reconciling Faith with Returns",
      description: "A common concern is that prioritizing your values means sacrificing financial returns. We strive to mitigate this concern through our rigorous screening process that is designed to help drive value over time while staying true to your Catholic beliefs",
    },
    {
     
      title: "Ongoing Maintenance",
      description: "With the speed of change today, it can be difficult to maintain a portfolio that reflects catholic values over time. Companies and industries are constantly shifting and what may have been an investment that met your needs yesterday may no longer fit those same standards today.",
    },
  ];

  return (
      <section className="pb-24 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
<div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase mb-6 max-w-2xl mx-auto">
            We Can Help You Bridge the Gap Between Your 
            <span className="text-[var(--yellowcolor)]"> Faith and Finances</span>
          </h2>
          <p className="font-open-sans text-xl text-white max-w-5xl mx-auto pt-5">
As a Catholic individual, you likely desire financial security and growth for yourself and your family. However, you also want your investments to reflect your values and avoid supporting activities that contradict your faith (e.g., abortion, embryonic stem cell research, adult entertainment).</p>
        </div>

 
 {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {Servicesfeatures.map((feature, index) => (
            <div key={index} style={{ animationDelay: `${index * 0.1}s` }} className="relative rounded-lg bg-gradient-pink-to-yellow p-[2px]">
            
              <div className="relative m-[1px] feature-card group h-full bg-black rounded-lg p-8 px-3 text-center z-10 border-0">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto">
                    {(() => {
                      const icons = [bridgegapimage1, bridgegapimage2, bridgegapimage3, bridgegapimage4];
                      const src = icons[index] ?? icons[0];
                      return <img src={src} alt={feature.title} className="mx-auto" />;
                    })()}
                  </div>
                </div>

                <h3 className="text-2xl font-normal max-w-[160px] mx-auto font-bebas-neue text-white mb-4">
                  {feature.title}
                </h3>

                <p className="text-white text-sm font-open-sans leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

         </div>
      </section>
    )
  }


export default LandingServicesNew;