import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Columns3, GripVertical, Eye, EyeOff, LayoutGrid, Save, Pencil, Trash2, Check, X, ArrowUp, ArrowDown, ChevronDown, Search } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ColumnDef {
  key: string;
  label: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "id", label: "Ticket ID" },
  { key: "itemCount", label: "No. of Items" },
  { key: "itemServiceOrders", label: "Item Service Orders" },
  { key: "status", label: "Status" },
  { key: "serviceOrder", label: "Service Order Ticket" },
  { key: "projectName", label: "Project" },
  { key: "state", label: "State" },
  { key: "ownerName", label: "Owner" },
  { key: "assignedToName", label: "Assigned To" },
  { key: "priority", label: "Priority" },
  { key: "warehouse", label: "Warehouse" },
  { key: "ownerEmail", label: "Owner Email" },
  { key: "assignedToEmail", label: "Assigned Email" },
  { key: "deliveryOrPickup", label: "Delivery/Pickup" },
  { key: "deliveringTo", label: "Delivering To" },
  { key: "siteNameCoordinates", label: "Site/Coordinates" },
  { key: "deliveryAddress", label: "Delivery Address" },
  { key: "requestedDeliveryDate", label: "Requested Delivery" },
  { key: "deliveryTimeSlots", label: "Delivery Time Slots" },
  { key: "driverKey", label: "Driver" },
  { key: "deliverySignoff", label: "Delivery Signoff" },
  { key: "accessConditions", label: "Access Conditions" },
  { key: "liftingEquipment", label: "Lifting Equipment" },
  { key: "steelWork", label: "Steel Work" },
  { key: "receiversName", label: "Receiver Name" },
  { key: "receiversPhone", label: "Receiver Phone" },
  { key: "pickupDate", label: "Pickup Date" },
  { key: "pickupTime", label: "Pickup Time" },
  { key: "subcontractorName", label: "Subcontractor" },
  { key: "subcontractorEmail", label: "Subcontractor Email" },
  { key: "internalComments", label: "Internal Comments" },
  { key: "goodsReceipt", label: "Goods Receipt" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "closedAt", label: "Closed" },
];

const DEFAULT_VISIBLE = ["id", "itemCount", "itemServiceOrders", "status", "serviceOrder", "projectName", "state", "ownerName", "assignedToName"];

interface SavedView {
  id: string;
  name: string;
  columns: string[];
  sortBy?: string | null;
  sortOrder?: "asc" | "desc";
  columnFilters?: Record<string, string>;
  statusFilter?: string;
}

function statusColor(status: string) {
  switch (status) {
    case "New": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Open":
    case "In Progress": return "bg-amber-50 text-amber-700 border-amber-200";
    case "Closed": return "bg-green-50 text-green-700 border-green-200";
    case "On Hold": return "bg-orange-50 text-orange-700 border-orange-200";
    default: return "bg-slate-100 text-slate-700";
  }
}

function formatCellValue(key: string, ticket: any): React.ReactNode {
  const val = ticket[key];
  if (key === "id") {
    return (
      <Link href={`/tickets/${ticket.id}`}>
        <span className="cursor-pointer hover:underline text-blue-600 font-medium" data-testid={`link-ticket-${ticket.id}`}>#{ticket.legacyId || ticket.id}</span>
      </Link>
    );
  }
  if (key === "status") {
    return <Badge variant="outline" className={statusColor(val)}>{val}</Badge>;
  }
  if (key === "itemCount") {
    return val != null ? val : "—";
  }
  if (["createdAt", "updatedAt", "closedAt", "requestedDeliveryDate", "pickupDate"].includes(key)) {
    return val ? new Date(val).toLocaleDateString() : "—";
  }
  return val || "—";
}

function loadColumnConfig(direction: string): string[] {
  try {
    const saved = localStorage.getItem(`ticketColumns_${direction}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_VISIBLE;
}

function saveColumnConfig(direction: string, columns: string[]) {
  localStorage.setItem(`ticketColumns_${direction}`, JSON.stringify(columns));
}

function loadViews(direction: string): SavedView[] {
  try {
    const saved = localStorage.getItem(`ticketViews_${direction}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveViews(direction: string, views: SavedView[]) {
  localStorage.setItem(`ticketViews_${direction}`, JSON.stringify(views));
}

function loadActiveViewId(direction: string): string | null {
  return localStorage.getItem(`ticketActiveView_${direction}`);
}

function saveActiveViewId(direction: string, id: string | null) {
  if (id) {
    localStorage.setItem(`ticketActiveView_${direction}`, id);
  } else {
    localStorage.removeItem(`ticketActiveView_${direction}`);
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ColumnHeaderDropdown({ columnKey, direction, sortBy, sortOrder, filterValue, onSort, onFilter }: {
  columnKey: string;
  direction: string;
  sortBy: string | null;
  sortOrder: "asc" | "desc";
  filterValue: string;
  onSort: (key: string, order: "asc" | "desc" | null) => void;
  onFilter: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [distinctValues, setDistinctValues] = useState<string[]>([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const label = ALL_COLUMNS.find(c => c.key === columnKey)?.label || columnKey;
  const isSorted = sortBy === columnKey;
  const isFiltered = !!filterValue;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearchText("");
      setLoadingValues(true);
      apiGet<string[]>(`/api/tickets/distinct-values?direction=${direction}&column=${columnKey}`)
        .then(vals => setDistinctValues(vals))
        .catch(() => setDistinctValues([]))
        .finally(() => setLoadingValues(false));
    }
  }, [open, direction, columnKey]);

  const filteredDistinct = searchText
    ? distinctValues.filter(v => v.toLowerCase().includes(searchText.toLowerCase()))
    : distinctValues;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 w-full px-3 py-2 text-left text-xs font-medium uppercase tracking-wider select-none hover:bg-slate-100 transition-colors",
          (isSorted || isFiltered) && "text-blue-700"
        )}
        data-testid={`button-colmenu-${columnKey}`}
      >
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-0 ml-auto flex-shrink-0">
          {isSorted && (
            sortOrder === "asc"
              ? <ArrowUp className="w-3 h-3 text-blue-600" />
              : <ArrowDown className="w-3 h-3 text-blue-600" />
          )}
          {isFiltered && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />
          )}
          <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-0 w-56 rounded-md border bg-white shadow-lg flex flex-col" style={{ maxHeight: "340px" }}>
          <div className="border-b">
            <button
              type="button"
              onClick={() => { onSort(columnKey, "asc"); setOpen(false); }}
              className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50", isSorted && sortOrder === "asc" && "bg-blue-50 text-blue-700")}
              data-testid={`button-sort-asc-${columnKey}`}
            >
              <ArrowUp className="w-3.5 h-3.5" /> Sort Ascending
            </button>
            <button
              type="button"
              onClick={() => { onSort(columnKey, "desc"); setOpen(false); }}
              className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50", isSorted && sortOrder === "desc" && "bg-blue-50 text-blue-700")}
              data-testid={`button-sort-desc-${columnKey}`}
            >
              <ArrowDown className="w-3.5 h-3.5" /> Sort Descending
            </button>
            {isSorted && (
              <button
                type="button"
                onClick={() => { onSort(columnKey, null); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                data-testid={`button-sort-clear-${columnKey}`}
              >
                <X className="w-3.5 h-3.5" /> Clear Sort
              </button>
            )}
          </div>

          <div className="px-2 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search values..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border rounded bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
                data-testid={`input-filter-search-${columnKey}`}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1" style={{ maxHeight: "180px" }}>
            {isFiltered && (
              <button
                type="button"
                onClick={() => { onFilter(columnKey, ""); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border-b"
                data-testid={`button-clear-filter-${columnKey}`}
              >
                <X className="w-3.5 h-3.5" /> Clear Filter
              </button>
            )}
            {loadingValues ? (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">Loading...</div>
            ) : filteredDistinct.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">No values found</div>
            ) : (
              filteredDistinct.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { onFilter(columnKey, val); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-slate-50 text-left truncate",
                    filterValue === val && "bg-blue-50 text-blue-700 font-medium"
                  )}
                  data-testid={`button-filter-val-${columnKey}-${val}`}
                >
                  {filterValue === val && <Check className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{val}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewsPanel({ direction, currentColumns, currentSortBy, currentSortOrder, currentColumnFilters, currentStatusFilter, onApplyView }: {
  direction: string;
  currentColumns: string[];
  currentSortBy: string | null;
  currentSortOrder: "asc" | "desc";
  currentColumnFilters: Record<string, string>;
  currentStatusFilter: string;
  onApplyView: (view: { columns: string[]; sortBy: string | null; sortOrder: "asc" | "desc"; columnFilters: Record<string, string>; statusFilter: string }, viewId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>(() => loadViews(direction));
  const [activeViewId, setActiveViewId] = useState<string | null>(() => loadActiveViewId(direction));
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSaving(false);
        setRenamingId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveNew = () => {
    if (!newName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: newName.trim(),
      columns: [...currentColumns],
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      columnFilters: { ...currentColumnFilters },
      statusFilter: currentStatusFilter,
    };
    const updated = [...views, view];
    setViews(updated);
    saveViews(direction, updated);
    setActiveViewId(view.id);
    saveActiveViewId(direction, view.id);
    setNewName("");
    setSaving(false);
  };

  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id);
    saveActiveViewId(direction, view.id);
    onApplyView({
      columns: view.columns,
      sortBy: view.sortBy ?? null,
      sortOrder: view.sortOrder ?? "desc",
      columnFilters: view.columnFilters ?? {},
      statusFilter: view.statusFilter ?? "All",
    }, view.id);
    setOpen(false);
  };

  const handleDeleteView = (id: string) => {
    const updated = views.filter(v => v.id !== id);
    setViews(updated);
    saveViews(direction, updated);
    if (activeViewId === id) {
      setActiveViewId(null);
      saveActiveViewId(direction, null);
    }
  };

  const handleRenameStart = (view: SavedView) => {
    setRenamingId(view.id);
    setRenameValue(view.name);
  };

  const handleRenameConfirm = () => {
    if (!renamingId || !renameValue.trim()) return;
    const updated = views.map(v => v.id === renamingId ? { ...v, name: renameValue.trim() } : v);
    setViews(updated);
    saveViews(direction, updated);
    setRenamingId(null);
    setRenameValue("");
  };

  const handleUpdateView = (view: SavedView) => {
    const updated = views.map(v => v.id === view.id ? {
      ...v,
      columns: [...currentColumns],
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      columnFilters: { ...currentColumnFilters },
      statusFilter: currentStatusFilter,
    } : v);
    setViews(updated);
    saveViews(direction, updated);
  };

  const handleClearView = () => {
    setActiveViewId(null);
    saveActiveViewId(direction, null);
    onApplyView({
      columns: DEFAULT_VISIBLE,
      sortBy: null,
      sortOrder: "desc",
      columnFilters: {},
      statusFilter: "All",
    }, null);
    setOpen(false);
  };

  const activeView = views.find(v => v.id === activeViewId);

  return (
    <div ref={panelRef} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} data-testid="button-views" className={activeView ? "border-blue-400 text-blue-700 bg-blue-50" : ""}>
        <LayoutGrid className="w-4 h-4 mr-1" />
        {activeView ? activeView.name : "Views"}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 rounded-md border bg-white shadow-lg flex flex-col">
          <div className="px-3 py-2 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            Saved Views
          </div>
          <div className="max-h-64 overflow-y-auto">
            {views.length === 0 && !saving && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">
                No saved views yet
              </div>
            )}
            {views.map(view => (
              <div
                key={view.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm border-b border-slate-100 hover:bg-slate-50 group",
                  activeViewId === view.id && "bg-blue-50"
                )}
              >
                {renamingId === view.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setRenamingId(null); }}
                      className="flex-1 px-2 py-0.5 border rounded text-sm"
                      autoFocus
                      data-testid="input-rename-view"
                    />
                    <button type="button" onClick={handleRenameConfirm} className="p-0.5 text-green-600 hover:bg-green-100 rounded" data-testid="button-rename-confirm">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setRenamingId(null)} className="p-0.5 text-slate-400 hover:bg-slate-200 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelectView(view)}
                      className="flex-1 text-left truncate font-medium"
                      data-testid={`button-select-view-${view.id}`}
                    >
                      {view.name}
                      <span className="text-xs text-slate-400 ml-1">
                        ({view.columns.length} cols{view.sortBy ? ", sorted" : ""}{view.columnFilters && Object.values(view.columnFilters).some(v => v) ? ", filtered" : ""})
                      </span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleUpdateView(view)}
                        title="Update with current columns"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        data-testid={`button-update-view-${view.id}`}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRenameStart(view)}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                        data-testid={`button-rename-view-${view.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteView(view.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        data-testid={`button-delete-view-${view.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {saving ? (
            <div className="px-3 py-2 border-t flex items-center gap-2">
              <input
                type="text"
                placeholder="View name..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveNew(); if (e.key === "Escape") setSaving(false); }}
                className="flex-1 px-2 py-1 border rounded text-sm"
                autoFocus
                data-testid="input-new-view-name"
              />
              <Button size="sm" onClick={handleSaveNew} disabled={!newName.trim()} data-testid="button-save-new-view" className="h-7 text-xs">
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSaving(false); setNewName(""); }} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="px-3 py-2 border-t flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSaving(true)} className="flex-1 h-7 text-xs" data-testid="button-save-view">
                <Save className="w-3 h-3 mr-1" /> Save Current as View
              </Button>
              {activeView && (
                <Button size="sm" variant="ghost" onClick={handleClearView} className="h-7 text-xs text-slate-500" data-testid="button-clear-view">
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColumnConfigPanel({ direction, visibleColumns, onUpdate }: {
  direction: string;
  visibleColumns: string[];
  onUpdate: (cols: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [orderedCols, setOrderedCols] = useState<string[]>(visibleColumns);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrderedCols(visibleColumns);
  }, [visibleColumns]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allKeys = ALL_COLUMNS.map(c => c.key);
  const hiddenCols = allKeys.filter(k => !orderedCols.includes(k));

  const toggleColumn = (key: string) => {
    let updated: string[];
    if (orderedCols.includes(key)) {
      if (orderedCols.length <= 1) return;
      updated = orderedCols.filter(k => k !== key);
    } else {
      updated = [...orderedCols, key];
    }
    setOrderedCols(updated);
    onUpdate(updated);
    saveColumnConfig(direction, updated);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...orderedCols];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setDragIdx(idx);
    setOrderedCols(updated);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    onUpdate(orderedCols);
    saveColumnConfig(direction, orderedCols);
  };

  const colLabel = (key: string) => ALL_COLUMNS.find(c => c.key === key)?.label || key;

  return (
    <div ref={panelRef} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} data-testid="button-columns">
        <Columns3 className="w-4 h-4 mr-1" /> Columns
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-white shadow-lg max-h-[70vh] flex flex-col">
          <div className="px-3 py-2 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            Visible Columns (drag to reorder)
          </div>
          <div className="overflow-y-auto flex-1">
            {orderedCols.map((key, idx) => (
              <div
                key={key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm cursor-grab border-b border-slate-100 hover:bg-slate-50",
                  dragIdx === idx && "bg-blue-50"
                )}
              >
                <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <span className="flex-1 truncate">{colLabel(key)}</span>
                <button
                  type="button"
                  onClick={() => toggleColumn(key)}
                  className="p-0.5 rounded hover:bg-slate-200 text-blue-600"
                  data-testid={`button-hide-col-${key}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {hiddenCols.length > 0 && (
              <>
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-t">
                  Hidden Columns
                </div>
                {hiddenCols.map(key => (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-slate-100 hover:bg-slate-50 text-slate-400"
                  >
                    <div className="w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{colLabel(key)}</span>
                    <button
                      type="button"
                      onClick={() => toggleColumn(key)}
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600"
                      data-testid={`button-show-col-${key}`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketTable({ direction }: { direction: "INBOUND" | "OUTBOUND" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => loadColumnConfig(direction));
  const [sortBy, setSortBy] = useState<string | null>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const debouncedColumnFilters = useDebounce(columnFilters, 400);
  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  const handleSort = useCallback((key: string, order: "asc" | "desc" | null) => {
    if (order === null) {
      setSortBy(null);
    } else {
      setSortBy(key);
      setSortOrder(order);
    }
    setPage(1);
  }, []);

  const handleColumnFilter = useCallback((key: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setSortBy(null);
    setStatusFilter("All");
    setSearchTerm("");
    setPage(1);
  }, []);

  const handleApplyView = (view: { columns: string[]; sortBy: string | null; sortOrder: "asc" | "desc"; columnFilters: Record<string, string>; statusFilter: string }, _viewId: string | null) => {
    setVisibleColumns(view.columns);
    saveColumnConfig(direction, view.columns);
    setSortBy(view.sortBy);
    setSortOrder(view.sortOrder);
    setColumnFilters(view.columnFilters);
    setStatusFilter(view.statusFilter);
    setPage(1);
  };

  const params = new URLSearchParams();
  params.set("direction", direction);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  if (statusFilter !== "All") params.set("status", statusFilter);
  if (searchTerm) params.set("search", searchTerm);
  if (sortBy) {
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
  }
  const cfObj: Record<string, string> = {};
  for (const [k, v] of Object.entries(debouncedColumnFilters)) {
    if (v) cfObj[k] = v;
  }
  if (Object.keys(cfObj).length > 0) {
    params.set("cf", JSON.stringify(cfObj));
  }

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", direction, statusFilter, searchTerm, page, sortBy, sortOrder, debouncedColumnFilters],
    queryFn: () => apiGet<any>(`/api/tickets?${params.toString()}`),
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const colCount = visibleColumns.length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6 items-center flex-wrap">
        <Input
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="max-w-sm bg-white"
          data-testid="input-search"
        />
        {(activeFilterCount > 0 || sortBy) && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-slate-500 text-xs" data-testid="button-clear-filters">
            <X className="w-3 h-3 mr-1" /> Clear all sorts/filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ViewsPanel
            direction={direction}
            currentColumns={visibleColumns}
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            currentColumnFilters={columnFilters}
            currentStatusFilter={statusFilter}
            onApplyView={handleApplyView}
          />
          <ColumnConfigPanel
            direction={direction}
            visibleColumns={visibleColumns}
            onUpdate={(cols) => {
              setVisibleColumns(cols);
              saveActiveViewId(direction, null);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-slate-50">
            <TableRow>
              {visibleColumns.map(key => {
                const widths: Record<string, string> = { id: "90px", itemCount: "70px", status: "90px", priority: "80px", state: "60px" };
                return (
                <TableHead key={key} className="whitespace-nowrap p-0 overflow-hidden" style={{ width: widths[key] || "150px" }}>
                  <ColumnHeaderDropdown
                    columnKey={key}
                    direction={direction}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    filterValue={columnFilters[key] || ""}
                    onSort={handleSort}
                    onFilter={handleColumnFilter}
                  />
                </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-slate-500">Loading...</TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-slate-500">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : tickets.map((ticket: any) => (
              <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                {visibleColumns.map(key => (
                  <TableCell key={key} className="overflow-hidden text-ellipsis whitespace-nowrap max-w-0">
                    <span className="block truncate" title={String(formatCellValue(key, ticket) ?? "")}>
                      {formatCellValue(key, ticket)}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">{total} ticket{total !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
