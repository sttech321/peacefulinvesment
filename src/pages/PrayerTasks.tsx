import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Heart, 
  Search, 
  Calendar,
  Clock,
  Loader2,
  Phone,
  Mail,
  User,
  Link as LinkIcon,
  Video,
  Send,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Footer from "@/components/Footer";

interface PrayerTask {
  id: string;
  name: string;
  link_or_video: string | null;
  status: 'TODO' | 'DONE' | 'NOT DONE';
  person_needs_help: string | null;
  number_of_days: number;
  duration_days: number;
  current_day: number;
  start_date: string;
  end_date: string | null;
  start_time: string;
  email: string | null;
  phone_number: string | null;
  folder_id: string | null;
  is_shared: boolean;
  created_by: string | null;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PrayerUserTask {
  id: string;
  task_id: string;
  user_id: string | null;
  anonymous_user_id: string | null;
  name: string;
  email: string;
  phone_number: string | null;
  person_needs_help: string | null;
  prayer_time: string;
  timezone: string;
  start_date: string;
  end_date: string;
  current_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task?: PrayerTask;
  completed_days?: number[];
}

export default function PrayerTasks() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PrayerTask[]>([]);
  const [userTasks, setUserTasks] = useState<PrayerUserTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<PrayerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startInstanceDialogOpen, setStartInstanceDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PrayerTask | null>(null);
  const [starting, setStarting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [instanceFormData, setInstanceFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    person_needs_help: "",
    prayer_time: "07:00",
    timezone: userTimezone,
  });

  const [emailFormData, setEmailFormData] = useState({
    email: "",
    prayer_request: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchUserTasks();

    // Set up real-time subscriptions
    const tasksChannel = supabase
      .channel('prayer-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_tasks',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const userTasksChannel = supabase
      .channel('prayer-user-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_user_tasks',
        },
        () => {
          fetchUserTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(userTasksChannel);
    };
  }, [user]);

  useEffect(() => {
    // Auto-fill email and phone for logged-in users
    if (user && user.email) {
      setInstanceFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prayer_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch prayer tasks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTasks = async () => {
    try {
      const query = supabase
        .from('prayer_user_tasks')
        .select(`
          *,
          task:prayer_tasks(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (user) {
        query.eq('user_id', user.id);
      } else {
        // For anonymous users, we'd need to track by email or session
        // For now, we'll fetch all and filter client-side
        query.is('user_id', null);
      }

      const { data, error } = await supabase
        .from('prayer_user_tasks')
        .select(`
          *,
          task:prayer_tasks(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by user
      let filtered = data || [];
      if (user) {
        filtered = filtered.filter((ut: PrayerUserTask) => ut.user_id === user.id);
      } else {
        // For anonymous users, we'd need email-based filtering
        // This is a simplified version
        filtered = filtered.filter((ut: PrayerUserTask) => !ut.user_id);
      }

      // Fetch completed days for each user task
      const tasksWithCompletions = await Promise.all(
        filtered.map(async (ut: PrayerUserTask) => {
          const { data: completions } = await supabase
            .from('prayer_daily_completions')
            .select('day_number')
            .eq('user_task_id', ut.id);
          
          return {
            ...ut,
            completed_days: completions?.map(c => c.day_number) || [],
          };
        })
      );

      setUserTasks(tasksWithCompletions);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    // Show only shared tasks or tasks user has instances of
    const userTaskIds = new Set(userTasks.map(ut => ut.task_id));
    filtered = filtered.filter(task => 
      task.is_shared || userTaskIds.has(task.id)
    );

    // Filter by search term (name)
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  const handleStartInstance = async () => {
    if (!selectedTask) return;

    try {
      if (!instanceFormData.name.trim() || !instanceFormData.email.trim()) {
        toast({
          title: "Error",
          description: "Please fill in required fields (Name and Email).",
          variant: "destructive",
        });
        return;
      }

      setStarting(true);

      // Calculate end date
      const startDate = new Date(selectedTask.start_date);
      const duration = selectedTask.duration_days || selectedTask.number_of_days;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration - 1);

      // Create user prayer instance
      const insertData: any = {
        task_id: selectedTask.id,
        name: instanceFormData.name,
        email: instanceFormData.email,
        phone_number: instanceFormData.phone_number || null,
        person_needs_help: instanceFormData.person_needs_help || null,
        prayer_time: instanceFormData.prayer_time,
        timezone: instanceFormData.timezone,
        start_date: selectedTask.start_date,
        end_date: endDate.toISOString().split('T')[0],
        current_day: 1,
        is_active: true,
      };

      if (user) {
        insertData.user_id = user.id;
      } else {
        insertData.anonymous_user_id = instanceFormData.email; // Use email as identifier
      }

      const { error } = await supabase
        .from('prayer_user_tasks')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: "Prayer Started",
        description: `You've started the ${selectedTask.name} prayer. You'll receive daily reminders.`,
      });

      setStartInstanceDialogOpen(false);
      setSelectedTask(null);
      setInstanceFormData({
        name: "",
        email: user?.email || "",
        phone_number: "",
        person_needs_help: "",
        prayer_time: "07:00",
        timezone: userTimezone,
      });

      fetchUserTasks();
    } catch (error) {
      console.error("Error starting prayer instance:", error);
      toast({
        title: "Error",
        description: "Failed to start prayer instance.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleCompleteDay = async (userTaskId: string, dayNumber: number) => {
    try {
      setCompleting(userTaskId);

      // Check if day can be completed
      const { data: canComplete, error: checkError } = await supabase
        .rpc('can_complete_prayer_day', {
          p_user_task_id: userTaskId,
          p_day_number: dayNumber,
        });

      if (checkError) throw checkError;

      if (!canComplete) {
        toast({
          title: "Cannot Complete",
          description: "This day cannot be marked as completed. It may be a future day or already completed.",
          variant: "destructive",
        });
        return;
      }

      // Insert completion
      const { error } = await supabase
        .from('prayer_daily_completions')
        .insert([{
          user_task_id: userTaskId,
          day_number: dayNumber,
        }]);

      if (error) throw error;

      // Update current_day in user task
      const userTask = userTasks.find(ut => ut.id === userTaskId);
      if (userTask) {
        const newCurrentDay = Math.max(userTask.current_day, dayNumber + 1);
        await supabase
          .from('prayer_user_tasks')
          .update({ current_day: newCurrentDay })
          .eq('id', userTaskId);
      }

      toast({
        title: "Day Completed",
        description: `Day ${dayNumber} has been marked as completed.`,
      });

      fetchUserTasks();
    } catch (error) {
      console.error("Error completing day:", error);
      toast({
        title: "Error",
        description: "Failed to mark day as completed.",
        variant: "destructive",
      });
    } finally {
      setCompleting(null);
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!emailFormData.email.trim() || !emailFormData.prayer_request.trim()) {
        toast({
          title: "Error",
          description: "Please fill in all fields.",
          variant: "destructive",
        });
        return;
      }

      setSendingEmail(true);

      const { data, error } = await supabase.functions.invoke('send-prayer-request', {
        body: {
          email: emailFormData.email,
          prayer_request: emailFormData.prayer_request,
          search_term: searchTerm,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your prayer request has been sent. We will get back to you soon.",
      });

      setEmailDialogOpen(false);
      setEmailFormData({
        email: "",
        prayer_request: "",
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send prayer request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleTaskClick = (task: PrayerTask) => {
    // Check if user already has an instance
    const existingInstance = userTasks.find(ut => ut.task_id === task.id);
    if (existingInstance) {
      toast({
        title: "Already Started",
        description: "You've already started this prayer. Check 'My Prayers' below.",
      });
      return;
    }

    setSelectedTask(task);
    setStartInstanceDialogOpen(true);
  };

  const getCurrentDay = (userTask: PrayerUserTask): number => {
    const startDate = new Date(userTask.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const duration = new Date(userTask.end_date).getTime() - startDate.getTime();
    const totalDays = Math.floor(duration / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays < 1) return 0; // Not started yet
    if (diffDays > totalDays) return totalDays; // Completed
    return diffDays;
  };

  const canCompleteToday = (userTask: PrayerUserTask): boolean => {
    const currentDay = getCurrentDay(userTask);
    if (currentDay < 1 || currentDay > (userTask.task?.duration_days || userTask.task?.number_of_days || 1)) {
      return false;
    }
    return !(userTask.completed_days || []).includes(currentDay);
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'TODO': 'default',
      'DONE': 'secondary',
      'NOT DONE': 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  // Get common timezones
  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  ];

  return (
    <div className="min-h-screen pink-yellow-shadow pt-20">
      <div className="animate-slide-up bg-black/20 px-6 py-10 text-center md:py-12 lg:py-24">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Prayer <span className="text-[var(--yellowcolor)]">Management</span>
          </h1>
          <p className="max-w-2xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white mb-6">
            Join us in prayer for those in need
          </p>
        </div>
      </div>

      <div className="space-y-6 px-5 py-8 md:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-7xl">
          {/* My Active Prayers */}
          {userTasks.length > 0 && (
            <Card className="border border-muted/20 p-0 rounded-lg bg-white/5 mb-6">
              <CardHeader>
                <CardTitle className="text-primary">My Active Prayers</CardTitle>
                <CardDescription>
                  Track your daily prayer progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTasks.map((userTask) => {
                    const currentDay = getCurrentDay(userTask);
                    const duration = userTask.task?.duration_days || userTask.task?.number_of_days || 1;
                    const canComplete = canCompleteToday(userTask);
                    const isCompleted = (userTask.completed_days || []).includes(currentDay);

                    return (
                      <Card key={userTask.id} className="border border-muted/20 p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white">{userTask.task?.name || 'Unknown Prayer'}</h3>
                              {userTask.person_needs_help && (
                                <Badge variant="outline" className="text-xs">
                                  For: {userTask.person_needs_help}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-white/70 space-y-1">
                              <div>Day {currentDay} of {duration}</div>
                              <div>Prayer Time: {userTask.prayer_time} ({userTask.timezone})</div>
                              {userTask.task?.link_or_video && (
                                <a
                                  href={userTask.task.link_or_video}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  {userTask.task.link_or_video.includes('youtube') || userTask.task.link_or_video.includes('video') ? (
                                    <Video className="h-4 w-4" />
                                  ) : (
                                    <LinkIcon className="h-4 w-4" />
                                  )}
                                  View Prayer Content
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canComplete && !isCompleted ? (
                              <Button
                                onClick={() => handleCompleteDay(userTask.id, currentDay)}
                                disabled={completing === userTask.id}
                                className="rounded-[8px]"
                              >
                                {completing === userTask.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Completing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark Day {currentDay} Done
                                  </>
                                )}
                              </Button>
                            ) : isCompleted ? (
                              <Badge variant="secondary" className="px-4 py-2">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Day {currentDay} Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="px-4 py-2">
                                {currentDay < 1 ? 'Not Started Yet' : 'Future Day'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
            <CardContent className="p-5">
              <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name (e.g., PATRICK)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-0 rounded-[8px] shadow-none mt-0 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-[8px] border-0 gap-0"
                  onClick={() => setEmailDialogOpen(true)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Prayer Not Listed? Request One
                </Button>
              </div>
              {searchTerm && filteredTasks.length === 0 && (
                <div className="mt-4 p-0 pt-1 bg-transparent rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium font-inter text-white">No task found with name "{searchTerm}"</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Prayer Not Listed? Request One" to let us know about this prayer need.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Tasks List */}
          <Card className="border-0 bg-transparent p-0 pt-8 md:pt-10">
            <CardHeader className="px-0 sm:px-0 pt-0 pb-0 p-0 sm:p-0">
              <CardTitle className="text-primary">Available Prayer Tasks</CardTitle>
              <CardDescription className="text-lg font-inter">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                </div>
              ) : filteredTasks.length === 0 && !searchTerm ? (
                <div className="text-center py-8 text-white justify-center min-h-[400px]">
                  No prayer tasks available at the moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => {
                    const hasInstance = userTasks.some(ut => ut.task_id === task.id);
                    return (
                      <Card
                        key={task.id}
                        className={`cursor-pointer transition-colors mt-4 p-6 ${
                          !hasInstance ? 'hover:bg-white/10' : ''
                        }`}
                        onClick={() => !hasInstance && handleTaskClick(task)}
                      >
                        <CardContent className="p-0 sm:p-0">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="md:col-span-1">
                              <div className="font-inter text-sm text-white">{task.name}</div>
                              {getStatusBadge(task.status)}
                              {hasInstance && (
                                <Badge variant="secondary" className="mt-2">
                                  <PlayCircle className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              {task.link_or_video ? (
                                <a
                                  href={task.link_or_video}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:no-underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {task.link_or_video.includes('youtube') || task.link_or_video.includes('video') ? (
                                    <Video className="h-4 w-4" />
                                  ) : (
                                    <LinkIcon className="h-4 w-4" />
                                  )}
                                  View
                                </a>
                              ) : (
                                <span className="text-white/70 text-sm">-</span>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              <div className="text-sm text-white">Duration</div>
                              <div className="text-white/70 text-sm pt-2">
                                {task.duration_days || task.number_of_days} days
                              </div>
                            </div>
                            <div className="md:col-span-1">
                              <div className="text-sm text-white">Start Date</div>
                              <div className="text-white/70 text-sm pt-2">
                                {new Date(task.start_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="md:col-span-1">
                              {task.is_shared && (
                                <Badge variant="outline" className="text-xs">
                                  Shared
                                </Badge>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              {!hasInstance ? (
                                <Button size="sm" className="w-full rounded-[8px]">
                                  Start Prayer
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="w-full text-center p-2 rounded-[8px]">
                                  Already Started
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />

      {/* Start Prayer Instance Dialog */}
      <Dialog open={startInstanceDialogOpen} onOpenChange={setStartInstanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Prayer</DialogTitle>
            <DialogDescription className="font-inter text-black/50">
              {user ? "Your email and phone will be auto-filled. You can edit them if needed." : "Please provide your information to start this prayer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="instance-name">Your Name *</Label>
              <Input
                id="instance-name"
                value={instanceFormData.name}
                onChange={(e) => setInstanceFormData({ ...instanceFormData, name: e.target.value })}
                placeholder="Your full name"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div>
              <Label htmlFor="instance-email">Your Email *</Label>
              <Input
                id="instance-email"
                type="email"
                value={instanceFormData.email}
                onChange={(e) => setInstanceFormData({ ...instanceFormData, email: e.target.value })}
                placeholder="your.email@example.com"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div>
              <Label htmlFor="instance-phone">Phone Number</Label>
              <Input
                id="instance-phone"
                type="tel"
                value={instanceFormData.phone_number}
                onChange={(e) => setInstanceFormData({ ...instanceFormData, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div>
              <Label htmlFor="instance-person">Person Who Needs Help (Optional)</Label>
              <Input
                id="instance-person"
                value={instanceFormData.person_needs_help}
                onChange={(e) => setInstanceFormData({ ...instanceFormData, person_needs_help: e.target.value })}
                placeholder="e.g., JEFF"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div>
              <Label htmlFor="instance-prayer-time">Daily Prayer Time *</Label>
              <Input
                id="instance-prayer-time"
                type="time"
                value={instanceFormData.prayer_time}
                onChange={(e) => setInstanceFormData({ ...instanceFormData, prayer_time: e.target.value })}
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
              <p className="text-xs text-muted-foreground mt-1">You'll receive reminders at this time daily</p>
            </div>
            <div>
              <Label htmlFor="instance-timezone">Timezone *</Label>
              <Select
                value={instanceFormData.timezone}
                onValueChange={(value) => setInstanceFormData({ ...instanceFormData, timezone: value })}
              >
                <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  {commonTimezones.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button className="border-0 rounded-[8px] hover:bg-white/80" variant="outline" onClick={() => setStartInstanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="border-0 rounded-[8px] hover:bg-primary/80 gap-0" onClick={handleStartInstance} disabled={starting}>
                {starting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Prayer"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Prayer Request</DialogTitle>
            <DialogDescription className="font-inter text-black/50">
              No task found with that name. Send us your prayer request and we'll add it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-email">Your Email *</Label>
              <Input
                id="email-email"
                type="email"
                value={emailFormData.email}
                onChange={(e) => setEmailFormData({ ...emailFormData, email: e.target.value })}
                placeholder="your.email@example.com"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div>
              <Label htmlFor="email-prayer">Prayer Request *</Label>
              <Textarea
                id="email-prayer"
                value={emailFormData.prayer_request}
                onChange={(e) => setEmailFormData({ ...emailFormData, prayer_request: e.target.value })}
                placeholder="Please describe the prayer need..."
                rows={5}
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none'
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button className="border-0 rounded-[8px] hover:bg-white/80" variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="border-0 rounded-[8px] hover:bg-primary/80 gap-0" onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
