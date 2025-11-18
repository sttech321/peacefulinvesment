import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, UserPlus, CheckCircle, AlertCircle, Database, Copy, User } from "lucide-react";
import { createAdminUser, getAdminCreationSQL } from "@/utils/createAdminUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CreateAdminUser() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sqlCode, setSqlCode] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const { toast } = useToast();

  // Get current user's email on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
        setEmail(user.email); // Pre-fill with current user's email
      }
    };
    getCurrentUser();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const result = await createAdminUser(email.trim());
      setResult(result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setEmail("");
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setResult({
        success: false,
        message: errorMessage
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSQL = () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address first",
        variant: "destructive",
      });
      return;
    }
    
    const sql = getAdminCreationSQL(email.trim());
    setSqlCode(sql);
  };

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(sqlCode);
      toast({
        title: "Success",
        description: "SQL code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy SQL code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Admin User</CardTitle>
          <CardDescription>
            Choose a method to grant admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="web" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="web">Web Interface</TabsTrigger>
              <TabsTrigger value="sql">SQL Method</TabsTrigger>
            </TabsList>
            
            <TabsContent value="web" className="space-y-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Self-Admin Creation:</strong> This method only works for making yourself an admin. 
                  The email field is pre-filled with your current account.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {currentUserEmail && (
                    <p className="text-xs text-muted-foreground">
                      Current user: {currentUserEmail}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Admin...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Make Me Admin
                    </>
                  )}
                </Button>
              </form>

              {result && (
                <Alert className={`${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.message}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="sql" className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommended Method:</strong> Use this SQL code in your Supabase SQL Editor for creating admin users for any account.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="sql-email">Email Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="sql-email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleGenerateSQL}
                    disabled={!email.trim()}
                  >
                    Generate SQL
                  </Button>
                </div>
              </div>

              {sqlCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>SQL Code</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleCopySQL}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{sqlCode}</code>
                    </pre>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Instructions:</h4>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Enter the email address above and click "Generate SQL"</li>
                  <li>2. Copy the generated SQL code</li>
                  <li>3. Go to your Supabase Dashboard → SQL Editor</li>
                  <li>4. Paste and run the SQL code</li>
                  <li>5. The user will now have admin privileges</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 p-4 bg-muted/20 rounded-lg">
            <h4 className="font-medium text-sm mb-2">After Creating Admin:</h4>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>• Log in with the admin user account</li>
              <li>• Navigate to: <code className="bg-muted px-1 rounded">/admin/dashboard</code></li>
              <li>• You'll have access to all admin features</li>
              <li>• Admin users can manage all system features</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
