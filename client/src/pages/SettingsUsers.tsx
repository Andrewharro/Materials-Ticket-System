import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, Check, ChevronsUpDown, Search } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function SearchableSelect({ value, onValueChange, options, placeholder = "Select..." }: {
  value: string;
  onValueChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label;
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !selectedLabel && "text-muted-foreground"
        )}
        data-testid="select-user-subcontractor"
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onValueChange(option.value); setOpen(false); setSearch(""); }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent"
                  )}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [usersExpanded, setUsersExpanded] = useState(true);
  const [rolesExpanded, setRolesExpanded] = useState(true);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ email: "", firstName: "", lastName: "", role: "USER", password: "", subcontractorId: "" });

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ key: "", label: "", description: "", sortOrder: "" });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<any[]>("/api/admin/users"),
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => apiGet<any[]>("/api/admin/roles"),
  });

  const { data: subcontractors = [] } = useQuery({
    queryKey: ["admin-subcontractors"],
    queryFn: () => apiGet<any[]>("/api/admin/subcontractors"),
  });

  const isSubcontractorRole = (roleKey: string) => roleKey.toUpperCase() === "SUBCONTRACTOR";

  const openCreateUser = () => {
    setEditUser(null);
    setUserForm({ email: "", firstName: "", lastName: "", role: "USER", password: "", subcontractorId: "" });
    setShowUserDialog(true);
  };

  const openEditUser = (user: any) => {
    setEditUser(user);
    setUserForm({ email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, password: "", subcontractorId: user.subcontractorId ? String(user.subcontractorId) : "" });
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editUser) {
        const data: any = { firstName: userForm.firstName, lastName: userForm.lastName, role: userForm.role };
        data.subcontractorId = isSubcontractorRole(userForm.role) && userForm.subcontractorId ? parseInt(userForm.subcontractorId) : null;
        if (userForm.password) data.password = userForm.password;
        await apiPatch(`/api/admin/users/${editUser.id}`, data);
        toast({ title: "User updated" });
      } else {
        const payload: any = { ...userForm };
        payload.subcontractorId = isSubcontractorRole(userForm.role) && userForm.subcontractorId ? parseInt(userForm.subcontractorId) : null;
        await apiPost("/api/admin/users", payload);
        toast({ title: "User created" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowUserDialog(false);
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

  const openCreateRole = () => {
    setEditRole(null);
    setRoleForm({ key: "", label: "", description: "", sortOrder: "" });
    setShowRoleDialog(true);
  };

  const openEditRole = (role: any) => {
    setEditRole(role);
    setRoleForm({
      key: role.key,
      label: role.label,
      description: role.description || "",
      sortOrder: role.sortOrder?.toString() || "",
    });
    setShowRoleDialog(true);
  };

  const handleSaveRole = async () => {
    try {
      const payload: any = {
        key: roleForm.key.toUpperCase().replace(/\s+/g, "_"),
        label: roleForm.label,
        description: roleForm.description || null,
        sortOrder: roleForm.sortOrder ? parseInt(roleForm.sortOrder) : null,
      };

      if (editRole) {
        await apiPatch(`/api/admin/roles/${editRole.id}`, payload);
        toast({ title: "Role updated" });
      } else {
        await apiPost("/api/admin/roles", payload);
        toast({ title: "Role created" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setShowRoleDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async (id: number) => {
    try {
      await apiDelete(`/api/admin/roles/${id}`);
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      toast({ title: "Role deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8" data-testid="text-users-title">Users & Roles</h1>

      <Card className="shadow-sm border-slate-200 mb-6">
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer select-none"
          onClick={() => setUsersExpanded(prev => !prev)}
          data-testid="button-toggle-users"
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Users</CardTitle>
            {usersExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); openCreateUser(); }}
            data-testid="button-create-user"
          >
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        </CardHeader>
        {usersExpanded && (
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
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
                    <TableCell className="text-slate-500">
                      {user.subcontractorId ? (subcontractors.find((sc: any) => sc.id === user.subcontractorId)?.name || "—") : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        user.isActive ? "text-green-700 bg-green-50" : "text-slate-500 bg-slate-100"
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditUser(user)} data-testid={`button-edit-user-${user.id}`}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(user)} data-testid={`button-toggle-user-${user.id}`}>
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer select-none"
          onClick={() => setRolesExpanded(prev => !prev)}
          data-testid="button-toggle-roles"
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Roles</CardTitle>
            {rolesExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); openCreateRole(); }}
            data-testid="button-create-role"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Role
          </Button>
        </CardHeader>
        {rolesExpanded && (
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRoles ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : roles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No roles defined yet.</TableCell></TableRow>
                ) : roles.map((role: any) => (
                  <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 font-mono">{role.key}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{role.label}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">{role.description || "—"}</TableCell>
                    <TableCell className="text-slate-500">{role.sortOrder ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRole(role)} data-testid={`button-edit-role-${role.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteRole(role.id)} data-testid={`button-delete-role-${role.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editUser && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} data-testid="input-user-email" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={userForm.firstName} onChange={e => setUserForm({ ...userForm, firstName: e.target.value })} data-testid="input-user-first-name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={userForm.lastName} onChange={e => setUserForm({ ...userForm, lastName: e.target.value })} data-testid="input-user-last-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm({ ...userForm, role: v, subcontractorId: isSubcontractorRole(v) ? userForm.subcontractorId : "" })}>
                <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.length > 0 ? roles.map((r: any) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  )) : (
                    <>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {isSubcontractorRole(userForm.role) && (
              <div className="space-y-2">
                <Label>Subcontractor Company</Label>
                <SearchableSelect
                  value={userForm.subcontractorId}
                  onValueChange={v => setUserForm({ ...userForm, subcontractorId: v })}
                  options={subcontractors.map((sc: any) => ({ value: String(sc.id), label: sc.name }))}
                  placeholder="Search subcontractors..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{editUser ? "New Password (leave blank to keep)" : "Password"}</Label>
              <Input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} data-testid="input-user-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} data-testid="button-save-user">{editUser ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={roleForm.key}
                onChange={e => setRoleForm({ ...roleForm, key: e.target.value })}
                placeholder="e.g. VIEWER"
                disabled={!!editRole}
                data-testid="input-role-key"
              />
              <p className="text-xs text-slate-400">Uppercase identifier, used internally</p>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={roleForm.label}
                onChange={e => setRoleForm({ ...roleForm, label: e.target.value })}
                placeholder="e.g. Viewer"
                data-testid="input-role-label"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roleForm.description}
                onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="What can this role do?"
                rows={3}
                data-testid="input-role-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={roleForm.sortOrder}
                onChange={e => setRoleForm({ ...roleForm, sortOrder: e.target.value })}
                placeholder="1"
                data-testid="input-role-sort-order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} data-testid="button-save-role">{editRole ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
