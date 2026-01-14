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
  Plus, 
  Trash2,
  Loader2,
  Phone,
  Mail,
  User,
  Link as LinkIcon,
  Video,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown, 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 
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

interface PrayerFolder {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export default function AdminPrayerTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PrayerTask[]>([]);
  const [folders, setFolders] = useState<PrayerFolder[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<PrayerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderView, setShowFolderView] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PrayerTask | null>(null);
  const [selectedFolderToDelete, setSelectedFolderToDelete] = useState<PrayerFolder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [viewPersonDialogOpen, setViewPersonDialogOpen] = useState(false);
  const [selectedPersonTask, setSelectedPersonTask] = useState<PrayerTask | null>(null);

  const [taskFormData, setTaskFormData] = useState({
    name: "",
    link_or_video: "",
    number_of_days: 1,
    start_date: new Date().toISOString().split('T')[0],
    start_time: "06:00",
    date_type: "today" as "today" | "traditional",
    traditional_date: "",
    folder_id: "",
  });

  const [folderFormData, setFolderFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    parent_id: "",
  });

  useEffect(() => {
    // Fetch data with error handling
    const loadData = async () => {
      try {
        await Promise.all([fetchFolders(), fetchTasks()]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Don't show toast here as individual functions handle their own errors
      }
    };

    loadData();

    // Set up real-time subscriptions
    let tasksChannel: any = null;
    let foldersChannel: any = null;

    try {
      tasksChannel = supabase
        .channel('prayer-tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prayer_tasks',
          },
          () => {
            fetchTasks().catch(err => console.error('Error in tasks subscription:', err));
          }
        )
        .subscribe();

      foldersChannel = supabase
        .channel('prayer-folders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prayer_folders',
          },
          () => {
            fetchFolders().catch(err => console.error('Error in folders subscription:', err));
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }

    return () => {
      if (tasksChannel) {
        supabase.removeChannel(tasksChannel);
      }
      if (foldersChannel) {
        supabase.removeChannel(foldersChannel);
      }
    };
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, statusFilter, folderFilter]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('prayer_folders')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error fetching folders:', error);
        // Check if table doesn't exist
        if (error.message?.includes('does not exist') || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('permission denied')) {
          toast({
            title: "Database Setup Required",
            description: "The prayer_folders table doesn't exist or you don't have permission. Please run the database migrations. Check DEBUG_PRAYER_TASKS.md for instructions.",
            variant: "destructive",
          });
          setFolders([]); // Set empty array to prevent crashes
          return;
        }
        throw error;
      }
      
      // If no data, set empty array
      if (!data) {
        setFolders([]);
        return;
      }
      
      // Count tasks per folder
      const foldersWithCounts = await Promise.all(
        data.map(async (folder) => {
          try {
            const { count, error: countError } = await supabase
              .from('prayer_tasks')
              .select('*', { count: 'exact', head: true })
              .eq('folder_id', folder.id);
            
            if (countError) {
              console.error('Error counting tasks for folder:', folder.id, countError);
              return { ...folder, task_count: 0 };
            }
            
            return { ...folder, task_count: count || 0 };
          } catch (err) {
            console.error('Error in count query for folder:', folder.id, err);
            return { ...folder, task_count: 0 };
          }
        })
      );
      
      setFolders(foldersWithCounts);
      setInitialLoad(false);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      const errorMessage = error?.message || 'Failed to fetch folders. Please check if the database migration has been run.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setFolders([]); // Set empty array to prevent crashes
      setInitialLoad(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prayer_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching tasks:', error);
        // Check if table doesn't exist
        if (error.message?.includes('does not exist') || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('permission denied')) {
          toast({
            title: "Database Setup Required",
            description: "The prayer_tasks table doesn't exist or you don't have permission. Please run the database migrations. Check DEBUG_PRAYER_TASKS.md for instructions.",
            variant: "destructive",
          });
          setTasks([]); // Set empty array to prevent crashes
          setLoading(false);
          setInitialLoad(false);
          return;
        }
        throw error;
      }
      setTasks(data || []);
      setInitialLoad(false);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      const errorMessage = error?.message || 'Failed to fetch prayer tasks. Please check if the database migration has been run.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setTasks([]); // Set empty array to prevent crashes
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    // Filter by search term (name)
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.person_needs_help?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Filter by folder
    if (folderFilter) {
      filtered = filtered.filter(task => task.folder_id === folderFilter);
    }

    setFilteredTasks(filtered);
  };

  const handleCreateTask = async () => {
    try {
      if (!taskFormData.name.trim()) {
        toast({
          title: "Error",
          description: "Task name is required.",
          variant: "destructive",
        });
        return;
      }

      let startDate: string;
      if (taskFormData.date_type === "today") {
        startDate = new Date().toISOString().split('T')[0];
      } else {
        if (!taskFormData.traditional_date) {
          toast({
            title: "Error",
            description: "Please select a traditional date.",
            variant: "destructive",
          });
          return;
        }
        startDate = taskFormData.traditional_date;
      }

      const insertData: any = {
        name: taskFormData.name,
        link_or_video: taskFormData.link_or_video || null,
        number_of_days: taskFormData.number_of_days,
        current_day: 1,
        start_date: startDate,
        start_time: taskFormData.start_time,
        status: 'TODO',
        created_by: user?.id,
      };

      // Only add folder_id if it's not empty and not "unassigned"
      if (taskFormData.folder_id && taskFormData.folder_id.trim() !== '' && taskFormData.folder_id !== 'unassigned') {
        insertData.folder_id = taskFormData.folder_id;
      }

      const { error } = await supabase
        .from('prayer_tasks')
        .insert(insertData);

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Prayer task created successfully.",
      });

      setCreateTaskDialogOpen(false);
      setTaskFormData({
        name: "",
        link_or_video: "",
        number_of_days: 1,
        start_date: new Date().toISOString().split('T')[0],
        start_time: "06:00",
        date_type: "today",
        traditional_date: "",
        folder_id: "",
      });
      fetchTasks();
      fetchFolders();
    } catch (error: any) {
      console.error('Error creating task:', error);
      const errorMessage = error?.message || 'Failed to create prayer task. Please check if the database migration has been run.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCreateFolder = async () => {
    try {
      if (!folderFormData.name.trim()) {
        toast({
          title: "Error",
          description: "Folder name is required.",
          variant: "destructive",
        });
        return;
      }

      const insertData: any = {
        name: folderFormData.name,
        email: folderFormData.email || null,
        phone_number: folderFormData.phone_number || null,
        created_by: user?.id,
      };

      // Only add parent_id if it's not empty and not "none"
      if (folderFormData.parent_id && folderFormData.parent_id.trim() !== '' && folderFormData.parent_id !== 'none') {
        insertData.parent_id = folderFormData.parent_id;
      }

      const { error } = await supabase
        .from('prayer_folders')
        .insert(insertData);

      if (error) {
        console.error('Error creating folder:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Folder created successfully.",
      });

      setCreateFolderDialogOpen(false);
      setFolderFormData({
        name: "",
        email: "",
        phone_number: "",
        parent_id: "",
      });
      fetchFolders();
    } catch (error: any) {
      console.error('Error creating folder:', error);
      const errorMessage = error?.message || 'Failed to create folder. Please check if the database migration has been run.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'TODO' | 'DONE' | 'NOT DONE') => {
    try {
      const { error } = await supabase
        .from('prayer_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task status updated successfully.",
      });

      fetchTasks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('prayer_tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });

      setDeleteTaskDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
      fetchFolders();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolderToDelete) return;

    try {
      setDeleting(true);
      
      // First, unassign all tasks from this folder
      await supabase
        .from('prayer_tasks')
        .update({ folder_id: null })
        .eq('folder_id', selectedFolderToDelete.id);

      // Delete the folder
      const { error } = await supabase
        .from('prayer_folders')
        .delete()
        .eq('id', selectedFolderToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder deleted successfully.",
      });

      setDeleteFolderDialogOpen(false);
      setSelectedFolderToDelete(null);
      fetchFolders();
      fetchTasks();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "Error",
        description: "Failed to delete folder.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAssignToFolder = async (taskId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('prayer_tasks')
        .update({ folder_id: folderId })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task assigned to folder successfully.",
      });

      fetchTasks();
      fetchFolders();
    } catch (error) {
      console.error('Error assigning task:', error);
      toast({
        title: "Error",
        description: "Failed to assign task to folder.",
        variant: "destructive",
      });
    }
  };

  const getFolderHierarchy = () => {
    const folderMap = new Map<string, PrayerFolder & { children: PrayerFolder[] }>();
    const rootFolders: (PrayerFolder & { children: PrayerFolder[] })[] = [];

    // Initialize all folders with children array
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build hierarchy
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id)!.children.push(folderWithChildren);
      } else {
        rootFolders.push(folderWithChildren);
      }
    });

    return rootFolders;
  };

  const renderFolderTree = (folderList: (PrayerFolder & { children: PrayerFolder[] })[], level = 0) => {
    return folderList.map(folder => {
      const isExpanded = expandedFolders.has(folder.id);
      const folderTasks = tasks.filter(t => t.folder_id === folder.id);
      const hasChildren = folder.children.length > 0;

      return (
        <div key={folder.id} className="mb-1">
          <div
            className={`flex items-center justify-between p-3 rounded-[8px] cursor-pointer transition-colors ${
              selectedFolder === folder.id
                ? 'bg-white/10'
                : 'hover:bg-muted/10'
            }`}
            onClick={() => {
              setSelectedFolder(folder.id);
              setFolderFilter(folder.id);
              setShowFolderView(false);
            }}
          >
            <div className="flex gap-2 flex-1">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExpanded = new Set(expandedFolders);
                    if (isExpanded) {
                      newExpanded.delete(folder.id);
                    } else {
                      newExpanded.add(folder.id);
                    }
                    setExpandedFolders(newExpanded);
                  }}
                  className="p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white" />
                  )}
                </button>
              )}
              {/* {!hasChildren && <div className="w-5" />} */}
              <Folder className="h-4 w-4 text-primary mt-1 hidden" />
              <div className="flex items-center gap-0 flex-wrap">

              <span className="font-medium text-white w-full">{folder.name}</span>
              {folder.email && (
                <span className="text-xs text-muted-foreground w-full">({folder.email})</span>
              )}
              <Badge variant="secondary" className="mt-2">
                {folderTasks.length} task{folderTasks.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-[4px] w-[28px] h-[28px] p-0  hover:bg-red-700 border-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFolderToDelete(folder);
                setDeleteFolderDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-white" />
            </Button>
          </div>
          {isExpanded && hasChildren && (
            <div className="ml-6 mt-1">
              {renderFolderTree(folder.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
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

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return "Unassigned";
    const folder = folders.find(f => f.id === folderId);
    return folder?.name || "Unknown";
  };

  // Always render something, even if loading
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Prayer Tasks </h2>
          <p className="text-muted-foreground">Fetching prayer task data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Prayer Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage prayer tasks and organize them by folders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-[8px] border-0 hover:bg-white/80 gap-0" onClick={() => setCreateFolderDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Create Folder
          </Button>
          <Button  className="gap-0 rounded-[8px] hover:bg-primary/80 border-0" onClick={() => setCreateTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
        {/* Folders Sidebar */}
        <Card className="lg:col-span-1 border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader>
            <CardTitle>Folders</CardTitle>
            <CardDescription>Organize tasks by person</CardDescription>
          </CardHeader>
          <CardContent className="sm:pt-0">
            <div className="space-y-2">
              <div
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFolder === null && !showFolderView
                    ? 'bg-muted/10'
                    : 'hover:bg-muted/10'
                }`}
                onClick={() => {
                  setSelectedFolder(null);
                  setFolderFilter(null);
                  setShowFolderView(false);
                }}
              >
                <div className="flex items-center gap-2 text-white">                  
                  <span className="font-medium text-white">All Tasks</span>
                  <Badge variant="secondary" className="ml-auto">
                    {tasks.length}
                  </Badge>
                </div>
              </div>
              {renderFolderTree(getFolderHierarchy())}
            </div>
          </CardContent>
        </Card>

        {/* Tasks View */}
        <Card className="lg:col-span-3 border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedFolder ? getFolderName(selectedFolder) : "All Tasks"}
                </CardTitle>
                <CardDescription>
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-0">
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-0 rounded-[8px] shadow-none mt-0 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-[8px] border-0 border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px] w-[200px]" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="TODO">TODO</SelectItem>
                  <SelectItem value="DONE">DONE</SelectItem>
                  <SelectItem value="NOT DONE">NOT DONE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tasks Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8 flex-wrap text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <span className="ml-3 text-muted-foreground w-full">Loading tasks...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No prayer tasks found.</p>
                <Button className="rounded-[8px] border-0 hover:bg-white/80 gap-0" onClick={() => setCreateTaskDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Task
                </Button>
              </div>
            ) : (
              
             <div className="rounded-md border border-muted/20 overflow-x-auto">
               <Table className="border-none p-0 rounded-lg bg-white/5">
                  <TableHeader>
                    <TableRow className="border-b border-muted/20 hover:bg-white/15 bg-white/15 text-white">
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Folder</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Person Needs Help</TableHead>
                      <TableHead className="text-white">Days</TableHead>
                      <TableHead className="text-white">Start Date & Time</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id} className="border-b border-muted/20 hover:bg-white/10">
                        <TableCell><span className="font-medium text-white">{task.name}</span></TableCell>
                        <TableCell>
                          <Select
                            value={task.folder_id || "unassigned"}
                            onValueChange={(value) =>
                              handleAssignToFolder(task.id, value === "unassigned" ? null : value)
                            }
                          >
                            <SelectTrigger className="rounded-[8px] border-0 border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px] w-[150px]" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {folders.map(folder => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  {folder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={task.status}
                            onValueChange={(value: 'TODO' | 'DONE' | 'NOT DONE') =>
                              handleUpdateStatus(task.id, value)
                            }
                          >
                            <SelectTrigger className="rounded-[8px] border-0 border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px] w-[120px]" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                              <SelectItem value="TODO">TODO</SelectItem>
                              <SelectItem value="DONE">DONE</SelectItem>
                              <SelectItem value="NOT DONE">NOT DONE</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {task.person_needs_help ? (
                            <Button
                              variant="link"
                              className="p-0 h-auto text-white hover:text-white hover:no-underline"
                              onClick={() => {
                                setSelectedPersonTask(task);
                                setViewPersonDialogOpen(true);
                              }}
                            >
                              {task.person_needs_help}
                            </Button>
                          ) : (
                            <span className="text-white hover:text-white hover:no-underline">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-white">{task.current_day} of {task.number_of_days}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-white">{formatDateTime(task.start_date, task.start_time)}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-[8px] border-0 bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              setSelectedTask(task);
                              setDeleteTaskDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Prayer Task</DialogTitle>
            <DialogDescription>
              Add a new prayer task that users can claim
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                value={taskFormData.name}
                onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                placeholder="e.g., Peaceful Investment"
              />
            </div>
            <div>
              <Label htmlFor="link_or_video">Link or Video</Label>
              <Input
                id="link_or_video"
                value={taskFormData.link_or_video}
                onChange={(e) => setTaskFormData({ ...taskFormData, link_or_video: e.target.value })}
                placeholder="https://..."
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div>
              <Label htmlFor="folder">Folder</Label>
              <Select
                value={taskFormData.folder_id || "unassigned"}
                onValueChange={(value) => setTaskFormData({ ...taskFormData, folder_id: value === "unassigned" ? "" : value })}
              >
                <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                  <SelectValue placeholder="Select a folder (optional)" />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="number_of_days">Number of Days *</Label>
              <Input
                id="number_of_days"
                type="number"
                min="1"
                value={taskFormData.number_of_days}
                onChange={(e) => setTaskFormData({ ...taskFormData, number_of_days: parseInt(e.target.value) || 1 })}
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div>
              <Label>Start Date *</Label>
              <Select
                value={taskFormData.date_type}
                onValueChange={(value: "today" | "traditional") =>
                  setTaskFormData({ ...taskFormData, date_type: value })
                }
              >
                <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="traditional">Traditional Date</SelectItem>
                </SelectContent>
              </Select>
              {taskFormData.date_type === "traditional" && (
                <Input
                  type="date"
                  value={taskFormData.traditional_date}
                  onChange={(e) => setTaskFormData({ ...taskFormData, traditional_date: e.target.value })}
                  className="mt-2 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none" style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                />
              )}
            </div>
            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={taskFormData.start_time}
                onChange={(e) => setTaskFormData({ ...taskFormData, start_time: e.target.value })}
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button className="rounded-[8px] hover:bg-muted/20 border-0" variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="rounded-[8px] border-0 hover:bg-primary/80 bg-primary" onClick={handleCreateTask}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize prayer tasks by person
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Name *</Label>
              <Input
                id="folder-name"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                value={folderFormData.name}
                onChange={(e) => setFolderFormData({ ...folderFormData, name: e.target.value })}
                placeholder="Person's name"
              />
            </div>
            <div>
              <Label htmlFor="folder-email">Email</Label>
              <Input
                id="folder-email"
                type="email"
                value={folderFormData.email}
                onChange={(e) => setFolderFormData({ ...folderFormData, email: e.target.value })}
                placeholder="email@example.com"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div>
              <Label htmlFor="folder-phone">Phone Number</Label>
              <Input
                id="folder-phone"
                type="tel"
                value={folderFormData.phone_number}
                onChange={(e) => setFolderFormData({ ...folderFormData, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
            <div>
              <Label htmlFor="folder-parent">Parent Folder (Subfolder)</Label>
              <Select
                value={folderFormData.parent_id || "none"}
                onValueChange={(value) => setFolderFormData({ ...folderFormData, parent_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px]" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                  <SelectValue placeholder="Select parent folder (optional)" />
                </SelectTrigger>
                <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                  <SelectItem value="none">None (Root Folder)</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button  className="rounded-[8px] hover:bg-muted/20 border-0" variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="rounded-[8px] border-0 hover:bg-primary/80 bg-primary" onClick={handleCreateFolder}>
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={deleteTaskDialogOpen} onOpenChange={setDeleteTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prayer Task</DialogTitle>
            <DialogDescription className="text-black/50 font-inter">
              Are you sure you want to delete "{selectedTask?.name}"? This action cannot be undone. ddd
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button className="rounded-[8px] hover:bg-muted/20 border-0" variant="outline" onClick={() => setDeleteTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-[8px] border-0 hover:bg-red-600/80 bg-red-600" variant="destructive" onClick={handleDeleteTask} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription className="text-black/70 font-inter">
              Are you sure you want to delete "{selectedFolderToDelete?.name}"? All tasks in this folder will be unassigned. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button className="rounded-[8px] hover:bg-muted/20 border-0" variant="outline" onClick={() => setDeleteFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-[8px] border-0 hover:bg-red-600/80 bg-red-600" variant="destructive" onClick={handleDeleteFolder} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Person Details Dialog */}
      <Dialog open={viewPersonDialogOpen} onOpenChange={setViewPersonDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Person Details</DialogTitle>
            <DialogDescription>
              Contact information for the person who needs help
            </DialogDescription>
          </DialogHeader>

          {selectedPersonTask && (
            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-flex-start gap-3">
                <User className="h-5 w-5 text-black/60 mt-0.5" />
                <div>
                  <p className="text-sm text-black">Name</p>
                  <p className="font-inter text-[14px] font-normal text-muted-foreground">
                    {selectedPersonTask.person_needs_help}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-flex-start gap-3">
                <Phone className="h-5 w-5 text-black/60 mt-0.5" />
                <div>
                  <p className="text-sm text-black">Phone</p>
                  {selectedPersonTask.phone_number ? (
                    <a
                      href={`tel:${selectedPersonTask.phone_number}`}
                      className="font-inter text-[14px] font-normal text-primary hover:underline"
                    >
                      {selectedPersonTask.phone_number}
                    </a>
                  ) : (
                    <span className="font-inter text-[14px] font-normal text-muted-foreground">Not provided</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-flex-start gap-3">
                <Mail className="h-5 w-5 text-black/60 mt-0" />
                <div>
                  <p className="text-sm text-black">Email</p>
                  {selectedPersonTask.email ? (
                    <a
                      href={`mailto:${selectedPersonTask.email}`}
                      className="font-inter text-[14px] font-normal text-primary hover:underline"
                    >
                      {selectedPersonTask.email}
                    </a>
                  ) : (
                    <span className="font-inter text-[14px] font-normal text-muted-foreground">Not provided</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button className="rounded-[8px] border-0 hover:bg-white/80" variant="outline" onClick={() => setViewPersonDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
