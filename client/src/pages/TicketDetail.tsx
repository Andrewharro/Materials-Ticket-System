import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Send, Plus, Trash2, ArrowLeft, Maximize2, Minimize2, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface TicketItemRow {
  id?: number;
  itemCode: string;
  description: string;
  uom: string;
  quantity: string;
  status: string;
  comments: string;
  serviceOrder: string;
}

const emptyForm = {
  status: "New",
  statusKey: "NEW",
  priority: "",
  state: "",
  projectName: "",
  warehouse: "",
  serviceOrder: "",
  ownerName: "",
  ownerEmail: "",
  assignedToName: "",
  assignedToEmail: "",
  deliveryOrPickup: "",
  deliveringTo: "",
  siteNameCoordinates: "",
  deliveryAddress: "",
  deliveryTimeSlots: "",
  receiversName: "",
  receiversPhone: "",
  subcontractorName: "",
  subcontractorEmail: "",
  internalComments: "",
};

export default function TicketDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUser = getStoredUser();

  const isNew = !params.id || params.id === "new";
  const ticketId = isNew ? undefined : parseInt(params.id);
  const isReadOnly = currentUser?.role === "SUBCONTRACTOR";

  const searchParams = new URLSearchParams(searchString);
  const directionParam = (searchParams.get("direction") || "INBOUND") as "INBOUND" | "OUTBOUND";
  const direction = isNew ? directionParam : undefined;

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => apiGet<any>(`/api/tickets/${ticketId}`),
    enabled: !!ticketId,
  });

  const { data: statuses } = useQuery({
    queryKey: ["statuses"],
    queryFn: () => apiGet<any[]>("/api/admin/statuses"),
  });

  const { data: subcontractorsList } = useQuery({
    queryKey: ["subcontractors"],
    queryFn: () => apiGet<any[]>("/api/admin/subcontractors"),
  });

  const [form, setForm] = useState<any>({ ...emptyForm });
  const [items, setItems] = useState<TicketItemRow[]>([]);
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [scOpen, setScOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    "#": 40, "Item Code": 130, "Description": 280, "UOM": 65, "Qty": 65,
    "Status": 100, "Service Order": 160, "Comments": 250,
  });
  const [expandedWidths, setExpandedWidths] = useState<Record<string, number>>({
    "#": 45, "Item Code": 140, "Description": 380, "UOM": 70, "Qty": 70,
    "Status": 110, "Service Order": 180, "Comments": 350,
  });
  const resizingRef = useRef<{ col: string; startX: number; startW: number; expanded: boolean } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  useEffect(() => {
    if (isNew && currentUser) {
      setForm({
        ...emptyForm,
        ownerName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        ownerEmail: currentUser.email || "",
      });
      setItems([]);
    }
  }, [isNew]);

  useEffect(() => {
    if (ticket) {
      setForm({
        status: ticket.status || "New",
        statusKey: ticket.statusKey || "NEW",
        priority: ticket.priority || "",
        state: ticket.state || "",
        projectName: ticket.projectName || "",
        warehouse: ticket.warehouse || "",
        serviceOrder: ticket.serviceOrder || "",
        ownerName: ticket.ownerName || "",
        ownerEmail: ticket.ownerEmail || "",
        assignedToName: ticket.assignedToName || "",
        assignedToEmail: ticket.assignedToEmail || "",
        deliveryOrPickup: ticket.deliveryOrPickup || "",
        deliveringTo: ticket.deliveringTo || "",
        siteNameCoordinates: ticket.siteNameCoordinates || "",
        deliveryAddress: ticket.deliveryAddress || "",
        deliveryTimeSlots: ticket.deliveryTimeSlots || "",
        receiversName: ticket.receiversName || "",
        receiversPhone: ticket.receiversPhone || "",
        subcontractorName: ticket.subcontractorName || "",
        subcontractorEmail: ticket.subcontractorEmail || "",
        internalComments: ticket.internalComments || "",
      });
      setItems(
        (ticket.items || []).map((item: any) => ({
          id: item.id,
          itemCode: item.itemCode || "",
          description: item.description || "",
          uom: item.uom || "",
          quantity: item.quantity || "",
          status: item.status || "",
          comments: item.comments || "",
          serviceOrder: item.serviceOrder || "",
        }))
      );
    }
  }, [ticket]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = e.clientX - resizingRef.current.startX;
      const newW = Math.max(40, resizingRef.current.startW + delta);
      if (resizingRef.current.expanded) {
        setExpandedWidths(prev => ({ ...prev, [resizingRef.current!.col]: newW }));
      } else {
        setColWidths(prev => ({ ...prev, [resizingRef.current!.col]: newW }));
      }
    };
    const onMouseUp = () => { resizingRef.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const ticketDirection = isNew ? directionParam : ticket?.direction;
  const backPath = ticketDirection === "OUTBOUND" ? "/outbound" : "/inbound";

  const canEdit = !isReadOnly && (isNew || currentUser?.role === "ADMIN" || currentUser?.role === "COORDINATOR" ||
    (currentUser?.role === "USER" && ticket?.createdByUserId === currentUser?.id));

  const hasUnsavedData = useCallback(() => {
    if (!isNew) return false;
    const checkFields = [
      "priority", "state", "projectName", "warehouse", "serviceOrder",
      "assignedToName", "assignedToEmail", "deliveryOrPickup", "deliveringTo",
      "siteNameCoordinates", "deliveryAddress", "deliveryTimeSlots",
      "receiversName", "receiversPhone", "subcontractorName", "subcontractorEmail",
      "internalComments",
    ];
    const hasFormData = checkFields.some(f => form[f]);
    const hasItems = items.some(i => i.itemCode || i.description || i.uom || i.quantity || i.comments);
    return !!(hasFormData || hasItems);
  }, [isNew, form, items]);

  const handleBack = () => {
    if (isNew && hasUnsavedData()) {
      setShowDiscardDialog(true);
    } else {
      setLocation(backPath);
    }
  };

  const handleSave = async () => {
    if (!form.state) { toast({ title: "State is required", variant: "destructive" }); return; }
    if (!form.projectName) { toast({ title: "Project name is required", variant: "destructive" }); return; }
    if (!items.some(i => i.itemCode)) { toast({ title: "At least one item code is required", variant: "destructive" }); return; }

    setSaving(true);
    try {
      if (isNew) {
        const result = await apiPost<any>("/api/tickets/create-full", {
          direction: directionParam,
          ticket: form,
          items: items.map(i => ({
            ...i,
            quantity: i.quantity || null,
            direction: directionParam,
          })),
        });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        toast({ title: "Ticket created successfully" });
        setLocation(`/tickets/${result.ticket.id}`);
      } else {
        await apiPost(`/api/tickets/${ticketId}/save`, {
          ticket: form,
          items: items.map(i => ({
            ...i,
            quantity: i.quantity || null,
            direction: ticket.direction,
          })),
        });
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        toast({ title: "Ticket saved successfully" });
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || isNew) return;
    try {
      await apiPost(`/api/tickets/${ticketId}/messages`, { messageText });
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    } catch (err: any) {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
    }
  };

  const addItem = () => {
    setItems([...items, { itemCode: "", description: "", uom: "", quantity: "", status: "", comments: "", serviceOrder: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  if (!isNew && isLoading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!isNew && !ticket) return <div className="p-8 text-xl font-medium">Ticket not found</div>;

  const messages = isNew ? [] : (ticket?.messages || []);

  const startResize = (col: string, e: React.MouseEvent, expanded: boolean) => {
    e.preventDefault();
    const w = expanded ? expandedWidths[col] : colWidths[col];
    resizingRef.current = { col, startX: e.clientX, startW: w, expanded };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const columns = [
    { key: "#", align: "center" as const },
    { key: "Item Code", align: "left" as const },
    { key: "Description", align: "left" as const },
    { key: "UOM", align: "left" as const },
    { key: "Qty", align: "right" as const },
    { key: "Status", align: "left" as const },
    { key: "Service Order", align: "left" as const },
    { key: "Comments", align: "left" as const },
  ];

  const renderItemsTable = (expanded: boolean) => {
    const widths = expanded ? expandedWidths : colWidths;
    return (
      <div className={`overflow-auto border-t border-slate-200 ${expanded ? "flex-1" : ""}`}>
        <table className="text-sm border-collapse" style={{ tableLayout: "fixed", width: columns.reduce((s, c) => s + widths[c.key], 0) + (canEdit ? 36 : 0) }}>
          <colgroup>
            {columns.map(c => <col key={c.key} style={{ width: widths[c.key] }} />)}
            {canEdit && <col style={{ width: 36 }} />}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map(c => (
                <th key={c.key} className="font-semibold text-slate-600 px-3 py-2 border-r border-slate-200 relative select-none" style={{ textAlign: c.align }}>
                  {c.key}
                  {c.key !== "#" && (
                    <span
                      onMouseDown={e => startResize(c.key, e, expanded)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/40"
                      style={{ zIndex: 20 }}
                    />
                  )}
                </th>
              ))}
              {canEdit && <th className="px-1 py-2 border-slate-200"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={i}
                data-testid={`row-item-${i}`}
                className={`border-b border-slate-100 hover:bg-blue-50/30 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
              >
                <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-400 text-xs tabular-nums">{i + 1}</td>
                <td className="border-r border-slate-200 p-0 overflow-hidden">
                  <input value={item.itemCode} onChange={e => updateItem(i, "itemCode", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 font-mono text-xs disabled:text-slate-700" data-testid={`input-item-code-${i}`} />
                </td>
                <td className="border-r border-slate-200 p-0 overflow-hidden">
                  <input value={item.description} onChange={e => updateItem(i, "description", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 disabled:text-slate-700" />
                </td>
                <td className="border-r border-slate-200 p-0 overflow-hidden">
                  <input value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 disabled:text-slate-700" />
                </td>
                <td className="border-r border-slate-200 p-0 overflow-hidden">
                  <input value={item.quantity} type="number" onChange={e => updateItem(i, "quantity", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 text-right tabular-nums disabled:text-slate-700" />
                </td>
                <td className="border-r border-slate-200 p-0 overflow-hidden">
                  <input value={item.status} onChange={e => updateItem(i, "status", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 disabled:text-slate-700" />
                </td>
                <td className="border-r border-slate-200 p-0 overflow-hidden">
                  <input value={item.serviceOrder} onChange={e => updateItem(i, "serviceOrder", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 font-mono text-xs disabled:text-slate-700" data-testid={`input-item-service-order-${i}`} />
                </td>
                <td className="p-0 overflow-hidden">
                  <input value={item.comments} onChange={e => updateItem(i, "comments", e.target.value)} disabled={!canEdit}
                    className="w-full px-3 py-1.5 bg-transparent outline-none focus:bg-blue-50 disabled:text-slate-700" data-testid={`input-item-comments-${i}`} />
                </td>
                {canEdit && (
                  <td className="px-1 py-1.5 text-center">
                    <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition-colors" data-testid={`button-remove-item-${i}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLineItemsSection = (expanded: boolean) => {
    const itemsTable = items.length === 0 ? (
      <p className="text-center py-8 text-slate-500 px-6">No line items were imported for this ticket from the SharePoint data source. Click "Add Item" to add items manually.</p>
    ) : renderItemsTable(expanded);

    if (expanded) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Line Items ({items.length})</h2>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={addItem} data-testid="button-add-item-expanded">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setItemsExpanded(false)} data-testid="button-collapse-items">
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {itemsTable}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Line Items ({items.length})</CardTitle>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={addItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setItemsExpanded(true)} data-testid="button-expand-items" title="Expand to full screen">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {itemsTable}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderChatMessages = () => (
    <>
      {isNew ? (
        <p className="text-sm text-slate-400 text-center py-4">Save the ticket first to start chatting.</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No messages yet.</p>
      ) : (
        messages.map((msg: any) => {
          const isLegacy = msg.messageText?.startsWith("[Legacy] ");
          const displayText = isLegacy ? msg.messageText.substring(9) : msg.messageText;
          return (
            <div key={msg.id} className={`rounded-lg p-3 border ${isLegacy ? "bg-amber-50/50 border-amber-100" : "bg-slate-50 border-slate-100"}`} data-testid={`message-${msg.id}`}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-sm text-slate-900">
                  {msg.senderFirstName} {msg.senderLastName}
                  {isLegacy && <span className="ml-2 text-xs font-normal text-amber-600">imported</span>}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{displayText}</p>
            </div>
          );
        })
      )}
    </>
  );

  const renderChatInput = () => (
    !isNew && !isReadOnly ? (
      <div className="flex gap-2 shrink-0">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSendMessage()}
          className="flex-1"
          data-testid="input-message"
        />
        <Button size="icon" onClick={handleSendMessage} data-testid="button-send-message">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    ) : null
  );

  const renderChatSection = (expanded: boolean) => {
    if (expanded) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Chat / Activity ({messages.length})</h2>
            <Button size="sm" variant="ghost" onClick={() => setChatExpanded(false)} data-testid="button-collapse-chat">
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 p-6">
            {renderChatMessages()}
          </div>
          <div className="px-6 pb-4">
            {renderChatInput()}
          </div>
        </div>
      );
    }

    return (
      <Card className="shadow-sm flex flex-col" style={{ maxHeight: "500px" }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Chat / Activity ({messages.length})</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setChatExpanded(true)} data-testid="button-expand-chat" title="Expand to full screen">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
            {renderChatMessages()}
          </div>
          {renderChatInput()}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on this new ticket. Would you like to save it or discard and go back?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardDialog(false)}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowDiscardDialog(false);
                setLocation(backPath);
              }}
              data-testid="button-discard"
            >
              Discard & go back
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardDialog(false);
                handleSave();
              }}
              data-testid="button-save-and-close"
            >
              Save ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} data-testid="button-back" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft style={{ width: 36, height: 36 }} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3" data-testid="text-ticket-title">
              {isNew ? "New Ticket" : `Ticket #${ticket.legacyId || ticket.id}`}
              <Badge variant="outline" className="text-sm">
                {ticketDirection}
              </Badge>
            </h1>
            {!isNew && (
              <p className="text-slate-500 mt-1">Created {new Date(ticket.createdAt).toLocaleString()}</p>
            )}
          </div>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-ticket">
            {saving ? "Saving..." : isNew ? "Create Ticket" : "Save Ticket"}
          </Button>
        )}
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
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => {
                    const st = statuses?.find((s: any) => s.title === v);
                    setForm({ ...form, status: v, statusKey: st?.key || "OTHER" });
                  }} disabled={!canEdit}>
                    <SelectTrigger data-testid="select-ticket-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(statuses || []).map((s: any) => (
                        <SelectItem key={s.id} value={s.title}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} disabled={!canEdit} data-testid="input-priority" />
                </div>
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} disabled={!canEdit} data-testid="input-project-name" />
                </div>
                <div className="space-y-2">
                  <Label>Service Order Ticket</Label>
                  <Input value={form.serviceOrder} onChange={e => setForm({ ...form, serviceOrder: e.target.value })} disabled={!canEdit} data-testid="input-service-order" />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={!canEdit} data-testid="input-state" />
                </div>
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Input value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })} disabled={!canEdit} data-testid="input-warehouse" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Delivery / Pickup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Subcontractor</Label>
                  <Popover open={scOpen} onOpenChange={setScOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={scOpen}
                        className="w-full justify-between font-normal"
                        disabled={!canEdit}
                        data-testid="select-subcontractor"
                      >
                        {form.subcontractorName || "Select subcontractor..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search subcontractor..." />
                        <CommandList className="max-h-[250px]">
                          <CommandEmpty>No subcontractor found.</CommandEmpty>
                          <CommandGroup>
                            {(subcontractorsList || []).map((sc: any) => (
                              <CommandItem
                                key={sc.id}
                                value={sc.name}
                                onSelect={() => {
                                  setForm({
                                    ...form,
                                    subcontractorName: sc.name,
                                    subcontractorEmail: sc.email || "",
                                    receiversName: sc.receiversName || form.receiversName,
                                    receiversPhone: sc.receiversContact || form.receiversPhone,
                                    deliveryAddress: sc.address || form.deliveryAddress,
                                  });
                                  setScOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", form.subcontractorName === sc.name ? "opacity-100" : "opacity-0")} />
                                {sc.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Subcontractor Email</Label>
                  <Input value={form.subcontractorEmail} onChange={e => setForm({ ...form, subcontractorEmail: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <Label>Delivery or Pickup</Label>
                  <Select value={form.deliveryOrPickup || ""} onValueChange={v => setForm({ ...form, deliveryOrPickup: v })} disabled={!canEdit}>
                    <SelectTrigger data-testid="select-delivery-pickup">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                      <SelectItem value="Pickup from Warehouse">Pickup from Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivering To</Label>
                  <Input value={form.deliveringTo} onChange={e => setForm({ ...form, deliveringTo: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <Label>Site / Coordinates</Label>
                  <Input value={form.siteNameCoordinates} onChange={e => setForm({ ...form, siteNameCoordinates: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <Label>Time Slots</Label>
                  <Input value={form.deliveryTimeSlots} onChange={e => setForm({ ...form, deliveryTimeSlots: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <Label>Receiver's Name</Label>
                  <Input value={form.receiversName} onChange={e => setForm({ ...form, receiversName: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <Label>Receiver's Phone</Label>
                  <Input value={form.receiversPhone} onChange={e => setForm({ ...form, receiversPhone: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Delivery Address</Label>
                  <Textarea value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })} disabled={!canEdit} />
                </div>
              </div>
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
                <Input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} disabled={!canEdit} data-testid="input-owner" />
              </div>
              <div className="space-y-2">
                <Label>Owner Email</Label>
                <Input value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Input value={form.assignedToName} onChange={e => setForm({ ...form, assignedToName: e.target.value })} disabled={!canEdit} data-testid="input-assigned-to" />
              </div>
              <div className="space-y-2">
                <Label>Assigned To Email</Label>
                <Input value={form.assignedToEmail} onChange={e => setForm({ ...form, assignedToEmail: e.target.value })} disabled={!canEdit} />
              </div>
            </CardContent>
          </Card>

          {renderChatSection(false)}
        </div>
      </div>

      {renderLineItemsSection(false)}

      {itemsExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setItemsExpanded(false)}>
          <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: "95vw", height: "90vh" }} onClick={e => e.stopPropagation()}>
            {renderLineItemsSection(true)}
          </div>
        </div>
      )}

      {chatExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setChatExpanded(false)}>
          <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: "60vw", height: "85vh" }} onClick={e => e.stopPropagation()}>
            {renderChatSection(true)}
          </div>
        </div>
      )}
    </div>
  );
}
