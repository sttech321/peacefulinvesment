import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Shield, FileText, User, Building2, TrendingUp, Clock } from 'lucide-react';

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  steps?: LoadingStep[];
  currentStep?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "Creating Your Account",
  subtitle = "Please wait while we set up your investment profile...",
  steps,
  currentStep = 0
}) => {
  const defaultSteps: LoadingStep[] = [
    {
      id: 'profile',
      title: 'Processing Profile Information',
      description: 'Validating your personal details and contact information',
      icon: User,
      completed: currentStep > 0
    },
    {
      id: 'documents',
      title: 'Verifying Documents',
      description: 'Reviewing and processing your uploaded documents',
      icon: FileText,
      completed: currentStep > 1
    },
    {
      id: 'security',
      title: 'Setting Up Security',
      description: 'Configuring your account security and preferences',
      icon: Shield,
      completed: currentStep > 2
    },
    {
      id: 'investment',
      title: 'Preparing Investment Profile',
      description: 'Setting up your investment preferences and goals',
      icon: TrendingUp,
      completed: currentStep > 3
    },
    {
      id: 'finalize',
      title: 'Finalizing Account',
      description: 'Completing your account setup and preparing your dashboard',
      icon: Building2,
      completed: currentStep > 4
    }
  ];

  const stepsToShow = steps || defaultSteps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-30 animate-pulse"></div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-xl text-slate-300">
            {subtitle}
          </p>
        </div>

        {/* Progress Card */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardContent className="p-8">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-300">Progress</span>
                <span className="text-sm font-medium text-slate-300">
                  {Math.round((currentStep / stepsToShow.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(currentStep / stepsToShow.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {stepsToShow.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = step.completed;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30' 
                        : isCompleted 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-slate-700/50 border border-slate-600'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white animate-pulse' 
                          : 'bg-slate-600 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium transition-colors duration-500 ${
                        isCompleted 
                          ? 'text-green-400' 
                          : isActive 
                            ? 'text-white' 
                            : 'text-slate-400'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-xs transition-colors duration-500 ${
                        isCompleted 
                          ? 'text-green-300' 
                          : isActive 
                            ? 'text-slate-300' 
                            : 'text-slate-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Status */}
                    {isActive && (
                      <div className="flex-shrink-0">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">This usually takes 30-60 seconds</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-20"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-20" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-blue-300 rounded-full animate-ping opacity-20" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

