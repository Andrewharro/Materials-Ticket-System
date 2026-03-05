import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockUsers = [
  { id: 1, name: "Admin User", email: "admin@example.com", role: "ADMIN", status: "Active" },
  { id: 2, name: "Alice Smith", email: "alice@example.com", role: "USER", status: "Active" },
  { id: 3, name: "Bob Coordinator", email: "bob@example.com", role: "COORDINATOR", status: "Active" },
  { id: 4, name: "Inactive User", email: "old@example.com", role: "USER", status: "Inactive" },
];

export default function SettingsUsers() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Users & Roles</h1>
        <Button>Invite User</Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
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
                {mockUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-slate-500">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        user.role === 'COORDINATOR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        user.status === 'Active' ? 'text-green-700 bg-green-50' : 'text-slate-500 bg-slate-100'
                       }`}>
                         {user.status}
                       </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
