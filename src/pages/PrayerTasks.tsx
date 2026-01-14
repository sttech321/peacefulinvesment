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
  current_day: number;
  start_date: string;
  start_time: string;
  email: string | null;
  phone_number: string | null;
  folder_id: string | null;
  created_by: string | null;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function PrayerTasks() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PrayerTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<PrayerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PrayerTask | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [claimFormData, setClaimFormData] = useState({
    email: "",
    phone_number: "",
    person_needs_help: "",
  });

  const [emailFormData, setEmailFormData] = useState({
    email: "",
    prayer_request: "",
  });

  useEffect(() => {
    fetchTasks();

    // Set up real-time subscription
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const filterTasks = () => {
    let filtered = tasks;

    // Filter by search term (name)
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  const handleClaimTask = async () => {
    if (!selectedTask) return;

    try {
      if (
        !claimFormData.email.trim() ||
        !claimFormData.phone_number.trim() ||
        !claimFormData.person_needs_help.trim()
      ) {
        toast({
          title: "Error",
          description: "Please fill in all fields.",
          variant: "destructive",
        });
        return;
      }

      setClaiming(true);

      // 1. Update task (claim)
      const { error: updateError } = await supabase
        .from("prayer_tasks")
        .update({
          email: claimFormData.email,
          phone_number: claimFormData.phone_number,
          person_needs_help: claimFormData.person_needs_help,
          status: "TODO",
          claimed_by: user?.id || null,
        })
        .eq("id", selectedTask.id);

      if (updateError) throw updateError;

      // 2. Send claim confirmation email
      const { error: emailError } = await supabase.functions.invoke(
        "send-claim-confirmation",
        {
          body: {
            email: claimFormData.email,
            task_name: selectedTask.name,
            person_needs_help: claimFormData.person_needs_help,
            start_date: selectedTask.start_date,
            start_time: selectedTask.start_time,
          },
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
        // Do NOT fail the claim if email fails
      }

      // 3. Success feedback
      toast({
        title: "Task Claimed Successfully",
        description:
          "Thank you for claiming this prayer task. A confirmation email has been sent.",
      });

      // 4. Cleanup
      setClaimDialogOpen(false);
      setSelectedTask(null);
      setClaimFormData({
        email: "",
        phone_number: "",
        person_needs_help: "",
      });

      fetchTasks();
    } catch (error) {
      console.error("Error claiming task:", error);
      toast({
        title: "Error",
        description: "Failed to claim prayer task.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
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

      // Call Supabase Edge Function to send email
      const { data, error } = await supabase.functions.invoke('send-prayer-request', {
        body: {
          email: emailFormData.email,
          prayer_request: emailFormData.prayer_request,
          search_term: searchTerm,
        },
      });
      console.log('Sending email:', data);
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
    if (task.status === 'TODO' && !task.email) {
      setSelectedTask(task);
      setClaimDialogOpen(true);
    }
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
                      style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>
                </div>
                {/* {searchTerm && filteredTasks.length === 0 && ( */}
                  <Button
                    variant="outline"
                    className="rounded-[8px] border-0 gap-0"
                    onClick={() => setEmailDialogOpen(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Prayer Not Listed? Request One
                  </Button>
                {/* )} */}
              </div>
              {searchTerm && filteredTasks.length === 0 && (
                <div className="mt-4 p-0 pt-1 bg-transparent rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium font-inter text-white">No task found with name "{searchTerm}"</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Send Prayer Request" to let us know about this prayer need.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks List */}
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
                  {filteredTasks.map((task) => (
                    <Card
                      key={task.id}
                      className={`cursor-pointer transition-colors mt-4 p-6 ${
                        task.status === 'TODO' && !task.email
                          ? 'hover:bg-white/10'
                          : ''
                      } ${
                        task.status !== 'TODO' || task.email
                          ? 'opacity-1'
                          : ''
                      }`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <CardContent className="p-0 sm:p-0">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div className="md:col-span-1">
                            <div className="font-inter text-sm text-white">{task.name}</div>
                            {getStatusBadge(task.status)}
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
                            <div className="text-sm text-white">Person needs help</div>
                            <div className="text-white/70 text-sm pt-2">
                              {task.person_needs_help || <span>-</span>}
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <div className="text-sm text-white">Days</div>
                            <div className="text-white/70 text-sm pt-2">
                              {task.current_day} of {task.number_of_days}
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <div className="text-sm text-white">Start Date & Time</div>
                            <div className="text-white/70 text-sm pt-2">
                              {formatDateTime(task.start_date, task.start_time)}
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            {task.status === 'TODO' && !task.email ? (
                              <Button size="sm" className="w-full rounded-[8px]">
                                Claim Task
                              </Button>
                            ) : (
                              <div className="text-sm text-white">
                                <span className="bg-green-200 text-green-800 block text-center p-2 rounded-[8px]">
                                {task.email ? 'Claimed' : 'Completed'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        
      </div>
</div>
      <Footer />

      {/* Claim Task Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Prayer Task</DialogTitle>
            <DialogDescription className="font-inter text-black/50">
              Please provide your contact information and the name of the person who needs help
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="claim-email">Your Email *</Label>
              <Input
                id="claim-email"
                type="email"
                value={claimFormData.email}
                onChange={(e) => setClaimFormData({ ...claimFormData, email: e.target.value })}
                placeholder="your.email@example.com"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div>
              <Label htmlFor="claim-phone">Your Phone Number *</Label>
              <Input
                id="claim-phone"
                type="tel"
                value={claimFormData.phone_number}
                onChange={(e) => setClaimFormData({ ...claimFormData, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div>
              <Label htmlFor="claim-person">Name of Person Who Needs Help *</Label>
              <Input
                id="claim-person"
                value={claimFormData.person_needs_help}
                onChange={(e) => setClaimFormData({ ...claimFormData, person_needs_help: e.target.value })}
                placeholder="e.g., JEFF"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button className="border-0 rounded-[8px] hover:bg-white/80" variant="outline" onClick={() => setClaimDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="border-0 rounded-[8px] hover:bg-primary/80 gap-0" onClick={handleClaimTask} disabled={claiming}>
                {claiming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim Task"
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
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
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
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
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
