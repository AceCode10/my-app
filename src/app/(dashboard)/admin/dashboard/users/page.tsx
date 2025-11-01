'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    role: string | string[];
    xp?: number;
    created_at: string;
}


function ManageUsersPage() {
    const supabase = createClient();
    const { toast } = useToast();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();

        // Set up realtime subscription
        const channel = supabase
            .channel('users-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users',
                },
                () => {
                    fetchUsers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users.' });
        } finally {
            setIsLoading(false);
        }
    }

    const handleEditRole = (user: UserProfile) => {
        setUserToEdit(user);
        const currentRole = Array.isArray(user.role) ? user.role.join(',') : user.role;
        setSelectedRole(currentRole);
    };

    const handleUpdateRole = async () => {
        if (!userToEdit || !selectedRole) return;
        setIsUpdating(true);

        // Convert string back to array if it contains commas, otherwise it's a single role string
        const newRole = selectedRole.includes(',') ? selectedRole.split(',') : selectedRole;

        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userToEdit.id);

            if (error) throw error;
            toast({ title: 'Role Updated', description: `${userToEdit.display_name}'s role has been changed.` });
            setUserToEdit(null);
        } catch (error) {
            console.error('Error updating role:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user role.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleDeleteUser = (user: UserProfile) => {
        setUserToDelete(user);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userToDelete.id);

            if (error) throw error;
            toast({ title: 'User Deleted', description: `${userToDelete.display_name} has been removed from the platform.` });
            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete user.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const getRoleBadge = (role: string | string[]) => {
        const roles = Array.isArray(role) ? role : [role];
        return roles.map(r => {
            const variant = r === 'admin' ? 'destructive' : (r === 'teacher' ? 'default' : 'secondary');
            return <Badge key={r} variant={variant} className="mr-1">{r}</Badge>
        });
    }
    
    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>View and manage all users on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>XP</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            users?.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name ?? undefined} />
                                                <AvatarFallback>{user.display_name?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{user.display_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>{user.xp?.toLocaleString()}</TableCell>
                                    <TableCell>{user.created_at ? format(new Date(user.created_at), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleEditRole(user)}>Edit Role</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user)}>Delete User</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Role for {userToEdit?.display_name}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="role-select">Role</Label>
                     <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger id="role-select">
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="content_editor">Content Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="admin,teacher">Admin & Teacher</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleUpdateRole} disabled={isUpdating}>
                         {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Delete User Alert Dialog */}
         <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user account for <span className="font-bold">{userToDelete?.display_name}</span> and all of their associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete User
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}

export default ManageUsersPage;
