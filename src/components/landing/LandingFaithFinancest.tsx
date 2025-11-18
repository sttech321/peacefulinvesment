import React, { PureComponent } from 'react'
import faithfinanceimg from '@/assets/faith-finance-img.png';


export default class LandingFaithFinancest extends PureComponent {
  render() {
    return (
       <section className='px-6 pb-24 pt-10'>
     <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between">

        <div className="lg:w-3/5 pr-0 lg:pr-12 mb-10 lg:mb-0">
            <h3 className="text-3xl font-inter text-white font-semibold uppercase">
                Catholic Investment Solutions for You: 
Aligning Your <span className='text-[var(--yellowcolor)]'>Faith & Finances </span>
            </h3>
<p className='font-open-sans text-lg text-white leading-[30px] pt-12'>Do you yearn to grow your wealth while staying true to your Catholic values? Many Catholic individuals, like you, share this desire. You’ve worked hard and saved diligently, and now you want your investments to reflect your faith. But navigating the complexities of financial planning while adhering to Catholic social teaching can be daunting. Finding catholic investment solutions for individuals that you can trust is also difficult.
    <br/>
    <br/>
At Aquinas Wealth Advisors, we specialize in helping Catholic individuals like yourself achieve your financial goals. We understand the importance of aligning your investments with your values. <br/>
    <br/>
We combine human expertise with innovative technology to create personalized financial plans and investment strategies that consider both your financial objectives and your Catholic beliefs.</p>
             
        </div>

        <div className="lg:w-2/5 flex justify-center">
             <img className='mx-auto' src={faithfinanceimg} alt='Join Icon' />
        </div>

    </div>


    
         </section>

    )
  }
}
