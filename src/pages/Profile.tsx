import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, User, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  employment_status: z.string().optional(),
  employer: z.string().optional(),
  annual_income: z.number().optional(),
  investment_experience: z.string().optional(),
  risk_tolerance: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const { profile, loading, updateProfile } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip_code: profile?.zip_code || "",
      employment_status: profile?.employment_status || "",
      employer: profile?.employer || "",
      annual_income: profile?.annual_income || undefined,
      investment_experience: profile?.investment_experience || "",
      risk_tolerance: profile?.risk_tolerance || "",
    },
  });

  // Update form values when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_code: profile.zip_code || "",
        employment_status: profile.employment_status || "",
        employer: profile.employer || "",
        annual_income: profile.annual_income || undefined,
        investment_experience: profile.investment_experience || "",
        risk_tolerance: profile.risk_tolerance || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      const result = await updateProfile(data);
      if (result.error) {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        setIsEditing(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pink-yellow-shadow pt-28 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
         <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" bis_skin_checked="1"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pink-yellow-shadow pt-28">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 ">
          {/* Profile Picture & Quick Info */}
          <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
            <Card className="bg-black rounded-sm min-h-full">
              <CardHeader>
                <CardTitle className="text-center text-3xl">Profile <span className="text-primary">Picture</span></CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Avatar className="h-24 w-24 mx-auto">
                  <AvatarImage src={profile?.avatar_url} />                                                                                       
                  <AvatarFallback>                                                    
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="rounded-[8px] font-inter border-0 shadow-none hover:bg-white/80">
                  <Upload className="h-4 w-4 mr-1" />
                  Change Photo
                </Button>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-muted-foreground">{profile?.full_name || "No name set"}</p>
                  <p className="text-muted-foreground">
                    Status: <span className="capitalize">{profile?.status || "Unverified"}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Profile: {profile?.has_completed_profile ? "Complete" : "Incomplete"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none md:col-span-2 ">
            <Card className="bg-black rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                {!isEditing && (
                  <div className="flex gap-2">
                    <Link to="/change-password">
                      <Button variant="outline" size="sm" className="rounded-[8px] font-inter border-0 shadow-none hover:bg-white/80">
                        <Lock className="h-4 w-4 mr-1" />
                        Change Password
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={() => setIsEditing(true)} size="sm" className="rounded-[8px] font-inter border-0 shadow-none hover:bg-white/80">
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Full Name</FormLabel>
                            <FormControl>
                              <Input
                               className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                               {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                               className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                               {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Address</FormLabel>
                          <FormControl>
                            <Input 
                              className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                              {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">City</FormLabel>
                            <FormControl>
                              <Input 
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">State</FormLabel>
                            <FormControl>
                              <Input 
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zip_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">ZIP Code</FormLabel>
                            <FormControl>
                              <Input 
                              className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                              {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="employment_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Employment Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                              <FormControl>
                                <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                  <SelectValue placeholder="Select employment status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                                <SelectItem value="employed">Employed</SelectItem>
                                <SelectItem value="self-employed">Self-employed</SelectItem>
                                <SelectItem value="unemployed">Unemployed</SelectItem>
                                <SelectItem value="retired">Retired</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="employer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Employer</FormLabel>
                            <FormControl>
                              <Input 
                                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                                {...field} disabled={!isEditing} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="annual_income"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Annual Income</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                              {...field} 
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              disabled={!isEditing} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="investment_experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Investment Experience</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                              <FormControl>
                                <SelectTrigger className="rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                  <SelectValue placeholder="Select experience level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="risk_tolerance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium leading-none text-muted-foreground">Risk Tolerance</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                              <FormControl>
                                <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                                  <SelectValue placeholder="Select risk tolerance" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {isEditing && (
                      <div className="flex gap-4 pt-4">
                        <Button type="submit" className="rounded-[8px] font-inter border-0 shadow-none hover:bg-primary/80" disabled={isUpdating}>
                          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          className="rounded-[8px] font-inter border-0 shadow-none hover:bg-white/80"
                          onClick={() => {
                            setIsEditing(false);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>  
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;