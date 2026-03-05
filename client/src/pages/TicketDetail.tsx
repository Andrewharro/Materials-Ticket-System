import { useParams } from "wouter";
import { mockTickets, mockTicketItems, mockMessages } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send } from "lucide-react";

export default function TicketDetail() {
  const { id } = useParams();
  const ticket = mockTickets.find(t => t.id === Number(id));
  const items = mockTicketItems.filter(i => i.ticketId === Number(id));
  const messages = mockMessages.filter(m => m.ticketId === Number(id));

  if (!ticket) return <div className="p-8 text-xl font-medium">Ticket not found</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Ticket #{ticket.id}
            <Badge variant="outline" className={
              ticket.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              ticket.status === 'Closed' ? 'bg-green-50 text-green-700 border-green-200' :
              'bg-slate-100 text-slate-700'
            }>
              {ticket.status}
            </Badge>
          </h1>
          <p className="text-slate-500 mt-1">Created on {new Date(ticket.createdAt).toLocaleString()}</p>
        </div>
        <div className="space-x-3">
          <Button variant="outline">Discard Changes</Button>
          <Button>Save Ticket</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input defaultValue={ticket.projectName} />
                </div>
                <div className="space-y-2">
                  <Label>Service Order</Label>
                  <Input defaultValue={ticket.serviceOrder} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input defaultValue={ticket.state} />
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Input value={ticket.direction} disabled className="bg-slate-50" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Line Items</CardTitle>
              <Button size="sm" variant="outline">Add Item</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell><Input defaultValue={item.itemCode} className="h-8" /></TableCell>
                      <TableCell><Input defaultValue={item.description} className="h-8" /></TableCell>
                      <TableCell><Input defaultValue={item.quantity} type="number" className="h-8 w-24" /></TableCell>
                      <TableCell><Input defaultValue={item.unit} className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-slate-500">No items added yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input defaultValue={ticket.ownerName} />
              </div>
              <div className="space-y-2">
                <Label>Assigned Coordinator</Label>
                <Input defaultValue={ticket.assignedToName} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm flex flex-col" style={{height: '400px'}}>
            <CardHeader>
              <CardTitle>Chat / Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.map(msg => (
                  <div key={msg.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm text-slate-900">{msg.senderName}</span>
                      <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm text-slate-700">{msg.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="icon"><Send className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
