import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockReferenceData = {
  departments: ["Engineering", "Procurement", "Site Operations", "Safety"],
  statuses: ["New", "In Progress", "On Hold", "Closed", "Not Assigned"],
  subcontractors: ["BuildCo", "SteelWorks Ltd", "Metro Concrete", "FastScaff"],
  techs: ["John Doe", "Jane Smith", "Mike Johnson"]
};

export default function SettingsReferenceData() {
  const [activeTab, setActiveTab] = useState("departments");

  const tabs = [
    { id: "departments", label: "Departments" },
    { id: "statuses", label: "Ticket Statuses" },
    { id: "subcontractors", label: "Subcontractors" },
    { id: "techs", label: "Department Techs" },
  ];

  const currentData = mockReferenceData[activeTab as keyof typeof mockReferenceData];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reference Data</h1>
        <p className="text-slate-500 mt-2">Manage standard dropdown lists and classification data used throughout the system.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex flex-col space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
                <CardDescription>Configure available options</CardDescription>
              </div>
              <Button size="sm">Add New</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                    <span className="font-medium text-slate-700">{item}</span>
                    <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-red-600">Remove</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
