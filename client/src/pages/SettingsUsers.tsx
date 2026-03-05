import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiGet, apiPost, apiPatch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function SettingsUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", role: "USER", password: "" });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<any[]>("/api/admin/users"),
  });

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: "", firstName: "", lastName: "", role: "USER", password: "" });
    setShowDialog(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setForm({ email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, password: "" });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editUser) {
        const data: any = { firstName: form.firstName, lastName: form.lastName, role: form.role };
        if (form.password) data.password = form.password;
        await apiPatch(`/api/admin/users/${editUser.id}`, data);
        toast({ title: "User updated" });
      } else {
        await apiPost("/api/admin/users", form);
        toast({ title: "User created" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (user: any) => {
    try {
      await apiPatch(`/api/admin/users/${user.id}`, { isActive: !user.isActive });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight" data-testid="text-users-title">Users & Roles</h1>
        <Button onClick={openCreate} data-testid="button-create-user">Add User</Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
              ) : users.map((user: any) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell className="text-slate-500">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.role === "ADMIN" ? "bg-purple-50 text-purple-700 border-purple-200" :
                      user.role === "COORDINATOR" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-slate-100 text-slate-700"
                    }>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      user.isActive ? "text-green-700 bg-green-50" : "text-slate-500 bg-slate-100"
                    }`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)} data-testid={`button-edit-user-${user.id}`}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(user)} data-testid={`button-toggle-user-${user.id}`}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editUser && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="input-user-email" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} data-testid="input-user-first-name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} data-testid="input-user-last-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="COORDINATOR">COORDINATOR</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{editUser ? "New Password (leave blank to keep)" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} data-testid="input-user-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="button-save-user">{editUser ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
