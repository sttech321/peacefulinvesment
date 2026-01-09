-- Create prayer_tasks table
CREATE TABLE public.prayer_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  link_or_video TEXT,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'DONE', 'NOT DONE')),
  person_needs_help TEXT,
  number_of_days INTEGER NOT NULL DEFAULT 1,
  current_day INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  email TEXT,
  phone_number TEXT,
  created_by UUID REFERENCES auth.users(id),
  claimed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prayer_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for prayer_tasks
-- Admins can do everything
CREATE POLICY "Admins can manage all prayer tasks" 
ON public.prayer_tasks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Users can view all active tasks
CREATE POLICY "Users can view all prayer tasks" 
ON public.prayer_tasks 
FOR SELECT 
USING (true);

-- Users can claim tasks (update with their info)
CREATE POLICY "Users can claim prayer tasks" 
ON public.prayer_tasks 
FOR UPDATE 
USING (
  status = 'TODO' OR 
  claimed_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create index for better performance
CREATE INDEX idx_prayer_tasks_status ON public.prayer_tasks(status);
CREATE INDEX idx_prayer_tasks_name ON public.prayer_tasks(name);
CREATE INDEX idx_prayer_tasks_created_by ON public.prayer_tasks(created_by);
CREATE INDEX idx_prayer_tasks_claimed_by ON public.prayer_tasks(claimed_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prayer_tasks_updated_at
BEFORE UPDATE ON public.prayer_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
