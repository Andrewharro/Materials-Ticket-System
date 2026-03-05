import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

type TabId = "statuses" | "departments" | "department-techs" | "subcontractors";

const tabConfig: { id: TabId; label: string; endpoint: string; nameField: string; fields: { key: string; label: string; type?: string }[] }[] = [
  {
    id: "statuses", label: "Ticket Statuses", endpoint: "/api/admin/statuses", nameField: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "sortOrder", label: "Sort Order", type: "number" },
    ],
  },
  {
    id: "departments", label: "Departments", endpoint: "/api/admin/departments", nameField: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "sortOrder", label: "Sort Order", type: "number" },
    ],
  },
  {
    id: "department-techs", label: "Department Techs", endpoint: "/api/admin/department-techs", nameField: "name",
    fields: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
    ],
  },
  {
    id: "subcontractors", label: "Subcontractors", endpoint: "/api/admin/subcontractors", nameField: "name",
    fields: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "project", label: "Project" },
    ],
  },
];

export default function SettingsReferenceData() {
  const [activeTab, setActiveTab] = useState<TabId>("statuses");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const tab = tabConfig.find(t => t.id === activeTab)!;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ref", activeTab],
    queryFn: () => apiGet<any[]>(tab.endpoint),
  });

  const openCreate = () => {
    setEditItem(null);
    const init: Record<string, string> = {};
    tab.fields.forEach(f => init[f.key] = "");
    setForm(init);
    setShowDialog(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const init: Record<string, string> = {};
    tab.fields.forEach(f => init[f.key] = item[f.key]?.toString() || "");
    setForm(init);
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const data: any = { ...form };
      tab.fields.forEach(f => {
        if (f.type === "number" && data[f.key]) data[f.key] = parseInt(data[f.key]);
      });

      if (editItem) {
        await apiPatch(`${tab.endpoint}/${editItem.id}`, data);
        toast({ title: "Updated" });
      } else {
        await apiPost(tab.endpoint, data);
        toast({ title: "Created" });
      }
      queryClient.invalidateQueries({ queryKey: ["ref", activeTab] });
      setShowDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await apiDelete(`${tab.endpoint}/${id}`);
      queryClient.invalidateQueries({ queryKey: ["ref", activeTab] });
      toast({ title: "Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight" data-testid="text-reference-title">Reference Data</h1>
        <p className="text-slate-500 mt-2">Manage standard dropdown lists and classification data.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex flex-col space-y-1">
          {tabConfig.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>Manage available options</CardDescription>
              </div>
              <Button size="sm" onClick={openCreate} data-testid="button-add-ref">
                <Plus className="w-4 h-4 mr-1" /> Add New
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-slate-500 py-4">Loading...</p>
              ) : items.length === 0 ? (
                <p className="text-slate-500 py-4 text-center">No items yet.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm" data-testid={`ref-item-${item.id}`}>
                      <div>
                        <span className="font-medium text-slate-700">{item[tab.nameField]}</span>
                        {item.description && <span className="text-sm text-slate-400 ml-2">— {item.description}</span>}
                        {item.email && <span className="text-sm text-slate-400 ml-2">({item.email})</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} data-testid={`button-edit-ref-${item.id}`}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(item.id)} data-testid={`button-delete-ref-${item.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "Add"} {tab.label.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tab.fields.map(f => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  value={form[f.key] || ""}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  data-testid={`input-ref-${f.key}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="button-save-ref">{editItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
