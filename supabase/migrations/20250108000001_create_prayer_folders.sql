-- Create prayer_folders table
CREATE TABLE public.prayer_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  parent_id UUID REFERENCES public.prayer_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to prayer_tasks table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prayer_tasks' 
    AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.prayer_tasks 
    ADD COLUMN folder_id UUID REFERENCES public.prayer_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.prayer_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for prayer_folders
-- Admins can do everything
CREATE POLICY "Admins can manage all prayer folders" 
ON public.prayer_folders 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Users can view all folders
CREATE POLICY "Users can view all prayer folders" 
ON public.prayer_folders 
FOR SELECT 
USING (true);

-- Create index for better performance
CREATE INDEX idx_prayer_folders_name ON public.prayer_folders(name);
CREATE INDEX idx_prayer_folders_email ON public.prayer_folders(email);
CREATE INDEX idx_prayer_folders_phone ON public.prayer_folders(phone_number);
CREATE INDEX idx_prayer_tasks_folder_id ON public.prayer_tasks(folder_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prayer_folders_updated_at
BEFORE UPDATE ON public.prayer_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
