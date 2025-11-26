import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Link } from "lucide-react";
import { Button } from "react-day-picker";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen pink-yellow-shadow pt-24 flex items-center justify-center">
      <div className="flex items-center justify-center h-full">
        <div className="text-center ">
          <h1 className="text-7xl font-bold mb-4 text-[var(--yellowcolor)]">404</h1>
          <p className="text-4xl mb-8 text-white">Oops! Page not found</p>
          <div className="bg-gradient-pink-to-yellow rounded-[12px] py-3 p-[2px] inline-block">
            <a href="/" className="g-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-sm font-semibold uppercase text-white hover:text-white">
              Return to Home
            </a>
          </div>  
        </div>
      </div>
    </div>
  );
};

export default NotFound;
