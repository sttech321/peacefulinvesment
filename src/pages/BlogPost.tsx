import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Eye, Tag, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  useBlog,
  type BlogPost as BlogPostType,
  type BlogCategory,
} from "@/hooks/useBlog";
import Footer from "@/components/Footer";
import { boxShadow } from "html2canvas/dist/types/css/property-descriptors/box-shadow";

type PrayerTaskLite = {
  id: string;
  number_of_days?: number | null;
  duration_days?: number | null;
};

type PrayerUserTaskLite = {
  id: string;
  task_id: string;
  user_id: string | null;
  email: string;
  phone_number: string | null;
  person_needs_help: string | null;
  prayer_time: string;
  timezone: string;
  start_date: string;
  end_date: string;
  current_day: number;
  is_active: boolean;
  completed_days?: number[];
  task?: PrayerTaskLite;
};

function extractPrayerTaskIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const m = t.trim().match(/^prayer_task:(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (m?.groups?.id) return m.groups.id;
  }
  return null;
}

function stripPrayerTaskTags(tags: string[]) {
  return tags.filter((t) => !/^prayer_task:[0-9a-f-]{36}$/i.test(t.trim()));
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getPostBySlug, incrementViewCount, categories } = useBlog();
  const { user } = useAuth();
  const { toast } = useToast();


  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTask, setUserTask] = useState<PrayerUserTaskLite | null>(null);
  const [completing, setCompleting] = useState(false);

  const mappedPrayerTaskId = useMemo(() => extractPrayerTaskIdFromTags((post as any)?.tags), [post]);

  const getUserDate = useCallback((tz: string) => {
    // Convert "now" into user's timezone-local date
    const today = new Date();
    return new Date(today.toLocaleString("en-US", { timeZone: tz }));
  }, []);

  const getCurrentDay = useCallback(
    (ut: PrayerUserTaskLite): number => {
      const startDate = new Date(ut.start_date);
      const userDate = getUserDate(ut.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      startDate.setHours(0, 0, 0, 0);
      userDate.setHours(0, 0, 0, 0);

      const diffTime = userDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const endDate = new Date(ut.end_date);
      endDate.setHours(0, 0, 0, 0);
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays < 1) return 0; // Not started yet
      if (diffDays > duration) return duration; // Completed
      return diffDays;
    },
    [getUserDate]
  );

  const canCompleteToday = useMemo(() => {
    if (!userTask) return false;
    const currentDay = getCurrentDay(userTask);
    const duration = userTask.task?.duration_days || userTask.task?.number_of_days || 1;
    if (currentDay < 1 || currentDay > duration) return false;
    return !((userTask.completed_days || []).includes(currentDay));
  }, [getCurrentDay, userTask]);

  const fetchPost = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    const postData = await getPostBySlug(slug);

    if (postData) {
      setPost(postData);
      // Increment view count
      await incrementViewCount(postData.id);
    } else {
      navigate('/blog');
    }

    setLoading(false);
  }, [slug, navigate]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Load user's prayer instance for this blog/prayer (mapped via tag prayer_task:<uuid>)
  useEffect(() => {
    const loadUserTask = async () => {
      if (!user || !mappedPrayerTaskId) {
        setUserTask(null);
        return;
      }

      try {
        const { data: ut, error } = await (supabase as any)
          .from("prayer_user_tasks")
          .select("*, task:prayer_tasks(id,number_of_days,duration_days)")
          .eq("is_active", true)
          .eq("user_id", user.id)
          .eq("task_id", mappedPrayerTaskId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!ut) {
          setUserTask(null);
          return;
        }

        // Fetch completed days
        const { data: completions } = await (supabase as any)
          .from("prayer_daily_completions")
          .select("day_number")
          .eq("user_task_id", ut.id);

        setUserTask({
          ...(ut as any),
          completed_days: (completions || []).map((c: any) => c.day_number),
        } as PrayerUserTaskLite);
      } catch (e: any) {
        console.warn("[BlogPost] Failed to load prayer progress:", e);
        setUserTask(null);
      }
    };

    void loadUserTask();
  }, [mappedPrayerTaskId, user]);

  const handleCompleteToday = useCallback(async () => {
    if (!userTask) return;
    const dayNumber = getCurrentDay(userTask);
    try {
      setCompleting(true);

      const { data: canComplete, error: checkError } = await supabase.rpc("can_complete_prayer_day" as any, {
        p_user_task_id: userTask.id,
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

      const { error } = await (supabase as any)
        .from("prayer_daily_completions")
        .insert([{ user_task_id: userTask.id, day_number: dayNumber }]);
      if (error) throw error;

      const newCurrentDay = Math.max(userTask.current_day || 1, dayNumber + 1);
      await (supabase as any).from("prayer_user_tasks").update({ current_day: newCurrentDay }).eq("id", userTask.id);

      toast({ title: "Day Completed", description: `Day ${dayNumber} has been marked as completed.` });

      // Refresh state (cheap)
      setUserTask((prev) =>
        prev
          ? {
              ...prev,
              current_day: newCurrentDay,
              completed_days: Array.from(new Set([...(prev.completed_days || []), dayNumber])).sort((a, b) => a - b),
            }
          : prev
      );
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to mark day as completed.", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  }, [getCurrentDay, toast, userTask]);

  // Strip HTML tags from excerpt for sharing (plain text only)
  const stripHtmlTags = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const sharePost = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt ? stripHtmlTags(post.excerpt) : '',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow px-6 pt-16 flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full opacity-20">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-full mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-16 flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Post <span className="text-[var(--yellowcolor)]">not found</span> </h1>
          <Link to="/blog" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] inline-block">
            <Button variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-sm font-semibold uppercase text-white hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryData: { name: string; color: string } =
    categories.find((cat: BlogCategory) => cat.slug === post.category) || {
      name: "General",
      color: "#6B7280",
    };

  const displayTags = stripPrayerTaskTags(post.tags || []);
  const currentDay = userTask ? getCurrentDay(userTask) : 0;
  const totalDays = userTask ? (userTask.task?.duration_days || userTask.task?.number_of_days || 1) : 0;

  return (
    <>

      <div className="min-h-screen pink-yellow-shadow pt-16 blog-singlepost">
        <article>

          <div className="px-6 py-10 md:py-12 lg:py-24 bg-black/20">
            <div className="max-w-7xl mx-auto">
              {/* Navigation */}
              {/* <div className="mb-0">
          <Link to="/blog">
            <Button variant="ghost" className="hover:bg-transparent bg-transparent text-white hover:text-muted-foreground p-0">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div> */}

              {/* Header */}
              <header className="mb-0">
                <div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 flex-wrap lg:flex-nowrap flex items-center">
                  <div className="flex flex-wrap items-center gap-0 mb-0 max-w-3xl pr-0 lg:pr-5">

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-muted-foreground pb-5 md:pb-7 w-full">
                      <Badge className="bg-gradient-yellow-to-pink block rounded-[20px] border-0 py-1 px-2 font-inter text-xs font-semibold uppercase text-white">
                        {categoryData.name}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.ceil(post.content.length / 200)} min read
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.view_count} views
                      </div>
                    </div>

                    <h1 className="pb-5 md:pb-7 font-inter text-2xl font-bold text-white md:text-3xl w-full">
                      {post.title}
                    </h1>

                      {post.excerpt && (
                       <div
                         className="blog-excerpt mx-auto max-w-3xl font-open-sans text-lg text-white pb-7 w-full prose prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-span:text-white prose-em:text-white prose-code:text-white"
                         dangerouslySetInnerHTML={{ 
                           __html: (() => {
                             let html = post.excerpt || '';
                             console.log('Original excerpt HTML:', html);
                            
                             html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
                             // Process links: ensure protocol, add target/rel if missing
                             // Match: <a ... href="url" ...> or <a href="url" ...>
                             html = html.replace(
                               /<a([^>]*)\bhref\s*=\s*["']([^"']+)["']([^>]*)>/gi,
                               (match, beforeAttrs, url, afterAttrs) => {
                                 console.log('Found link:', { match, beforeAttrs, url, afterAttrs });
                                 
                                 // Fix URLs that incorrectly point to our domain but should be external
                                 // e.g., https://www.peacefulinvestment.com/admin/www.google.com -> https://www.google.com
                                 let fullUrl = url;
                                 const ourDomainPattern = /^https?:\/\/(www\.)?peacefulinvestment\.com\/admin\/(.+)$/i;
                                 const domainMatch = url.match(ourDomainPattern);
                                 
                                 if (domainMatch) {
                                   // Extract the external domain from the path
                                   const externalDomain = domainMatch[2];
                                   fullUrl = 'https://' + externalDomain;
                                   console.log('Fixed incorrect domain redirect in excerpt:', url, '->', fullUrl);
                                 } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('#') && !url.startsWith('/')) {
                                   // URLs without protocol - add https://
                                   fullUrl = 'https://' + url;
                                   console.log('Added https:// protocol:', fullUrl);
                                 }
                                 
                                 // Check if target/rel already exist
                                 const hasTarget = /target\s*=/i.test(beforeAttrs + afterAttrs);
                                 const hasRel = /rel\s*=/i.test(beforeAttrs + afterAttrs);
                                 
                                 // Build additional attributes
                                 let additionalAttrs = '';
                                 if (!hasTarget && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                                   additionalAttrs += ' target="_blank"';
                                 }
                                 if (!hasRel && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                                   additionalAttrs += ' rel="noopener noreferrer"';
                                 }
                                 
                                 // Reconstruct the link tag with correct href
                                 const newMatch = `<a${beforeAttrs} href="${fullUrl}"${afterAttrs}${additionalAttrs}>`;
                                 console.log('Processed link:', newMatch);
                                 return newMatch;
                               }
                             );
                             
                             console.log('Final processed HTML:', html);
                             return html;
                           })()
                         }}
                       />
                     )}

                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-wrap gap-2">
                        {displayTags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-normal font-open-sans text-white p-1 px-3 bg-transparent">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}



                        <Button
                          onClick={sharePost}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 ml-0 p-1 px-4 border-0 h-26 bg-primary text-black hover:bg-primary/70 focus:ring-2 focus:ring-offset-2 focus:ring-primary hover:text-white shadow-none"
                          style={{ boxShadow: 'none' }}
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {/* Daily progress + Done (logged-in users only, requires mapping tag prayer_task:<uuid>) */}
                    {user && mappedPrayerTaskId && (
                      <div className="mt-6 w-full max-w-3xl">
                        <div className="rounded-lg border border-muted-foreground/20 bg-white/5 p-4">
                          {userTask ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <div className="text-white font-semibold">My Prayer Progress</div>
                                <div className="text-white/70 text-sm">
                                  Day {currentDay} of {totalDays} • Prayer Time: {userTask.prayer_time} ({userTask.timezone})
                                </div>
                                {userTask.person_needs_help && (
                                  <div className="text-white/70 text-sm">For: {userTask.person_needs_help}</div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="rounded-[8px] border-0 hover:bg-primary/80"
                                  disabled={!canCompleteToday || completing}
                                  onClick={handleCompleteToday}
                                >
                                  {completing ? "Saving..." : "Done (Mark Today Complete)"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-white/70 text-sm">
                              To track your daily progress and get reminders, start this prayer from the Catholic list (Join Prayer).
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="">
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-auto object-cover rounded-md mt-0"
                      />
                    )}
                  </div>
                </div>
              </header>
            </div>
          </div>


          {/* Content */}
          <div className="px-6">
            <div className="max-w-7xl mx-auto pt-10">
              <div
                className="prose prose-lg prose-invert max-w-none font-open-sans prose-headings:text-white prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-6 prose-h1:pt-8 prose-h2:text-[22px] prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6 prose-p:text-white prose-p:text-[16px] prose-p:mb-4 prose-p:leading-relaxed prose-strong:text-white prose-strong:font-bold prose-blockquote:text-white prose-blockquote:border-primary prose-blockquote:border-l-4 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-6 prose-ul:text-white prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2 prose-ul:mb-4 prose-ol:text-white prose-li:text-white prose-a:text-white prose-a:underline hover:prose-a:text-primary prose-code:text-white prose-pre:text-white prose-em:text-white prose-span:text-white"
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    let html = post.content || '';
                    console.log('Original content HTML:', html);
                    
                    // Remove empty paragraph tags with just line breaks: <p><br></p>, <p><br/></p>, <p><br /></p>
                    html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
                    console.log('Removed empty <p><br></p> tags from content');
                    
                    // Process links: ensure protocol, add target/rel if missing
                    html = html.replace(
                      /<a([^>]*)\bhref\s*=\s*["']([^"']+)["']([^>]*)>/gi,
                      (match, beforeAttrs, url, afterAttrs) => {
                        console.log('Found link in content:', { match, beforeAttrs, url, afterAttrs });
                        
                        // Fix URLs that incorrectly point to our domain but should be external
                        // e.g., https://www.peacefulinvestment.com/admin/www.google.com -> https://www.google.com
                        let fullUrl = url;
                        const ourDomainPattern = /^https?:\/\/(www\.)?peacefulinvestment\.com\/admin\/(.+)$/i;
                        const domainMatch = url.match(ourDomainPattern);
                        
                        if (domainMatch) {
                          // Extract the external domain from the path
                          const externalDomain = domainMatch[2];
                          fullUrl = 'https://' + externalDomain;
                          console.log('Fixed incorrect domain redirect in content:', url, '->', fullUrl);
                        } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('#') && !url.startsWith('/')) {
                          // URLs without protocol - add https://
                          fullUrl = 'https://' + url;
                          console.log('Added https:// protocol to content link:', fullUrl);
                        }
                        
                        // Check if target/rel already exist
                        const hasTarget = /target\s*=/i.test(beforeAttrs + afterAttrs);
                        const hasRel = /rel\s*=/i.test(beforeAttrs + afterAttrs);
                        
                        // Build additional attributes
                        let additionalAttrs = '';
                        if (!hasTarget && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                          additionalAttrs += ' target="_blank"';
                        }
                        if (!hasRel && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))) {
                          additionalAttrs += ' rel="noopener noreferrer"';
                        }
                        
                        // Reconstruct the link tag with correct href
                        const newMatch = `<a${beforeAttrs} href="${fullUrl}"${afterAttrs}${additionalAttrs}>`;
                        console.log('Processed content link:', newMatch);
                        return newMatch;
                      }
                    );
                    
                    console.log('Final processed content HTML:', html);
                    return html;
                  })()
                }}
              />
            </div>
          </div>

          {/* Media Gallery */}
          {post.media && post.media.length > 0 && (
            <div className="px-6">
              <div className="max-w-7xl mx-auto pt-10">
                <h2 className="text-2xl font-bold text-white mb-6">Media Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {post.media.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.media_type === "image" ? (
                        <img
                          src={media.file_url}
                          alt={media.caption || media.filename}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      ) : media.media_type === "video" ? (
                        <video
                          src={media.file_url}
                          controls
                          className="w-full h-64 object-cover rounded-lg"
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <a
                          href={media.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-8 border border-muted-foreground/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center"
                        >
                          <FileText className="w-12 h-12 mx-auto mb-2 text-primary" />
                          <p className="text-sm text-white font-medium truncate">{media.filename}</p>
                          {media.caption && (
                            <p className="text-xs text-muted-foreground mt-1">{media.caption}</p>
                          )}
                        </a>
                      )}
                      {media.caption && media.media_type !== "document" && (
                        <p className="text-sm text-muted-foreground mt-2">{media.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="border-0 border-muted-foreground/10 px-5 py-10 md:py-12 xl:py-14">
            <div className="text-center">
              <p className="text-white mb-4">
                Share this prayer with others who might benefit
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/blog" className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                  <Button variant="outline" className=" hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white">
                    Read More Articles
                  </Button>
                </Link>
                <span className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                  <Button onClick={sharePost} className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white">
                    <Share2 className="w-4 h-4 mr-1" />
                    Share Article
                  </Button></span>
              </div>
            </div>
          </footer>
        </article>
      </div>
      <Footer />
    </>
  );
};


export default BlogPost;