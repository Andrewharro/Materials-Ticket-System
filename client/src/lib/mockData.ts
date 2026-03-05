export type Role = "USER" | "COORDINATOR" | "ADMIN";
export type Direction = "INBOUND" | "OUTBOUND";
export type Status = "New" | "In Progress" | "On Hold" | "Closed" | "Not Assigned";

export const mockUser = {
  id: 1,
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN" as Role,
};

export const mockTickets = [
  {
    id: 101,
    direction: "INBOUND",
    status: "New",
    ownerName: "Alice Smith",
    assignedToName: "Bob Coordinator",
    serviceOrder: "SO-1001",
    state: "NSW",
    projectName: "Sydney Metro",
    createdAt: "2026-03-01T10:00:00Z"
  },
  {
    id: 102,
    direction: "OUTBOUND",
    status: "In Progress",
    ownerName: "Charlie Brown",
    assignedToName: "Admin User",
    serviceOrder: "SO-1002",
    state: "VIC",
    projectName: "Melbourne Build",
    createdAt: "2026-03-02T11:30:00Z"
  },
  {
    id: 103,
    direction: "INBOUND",
    status: "Closed",
    ownerName: "David Jones",
    assignedToName: "Alice Smith",
    serviceOrder: "SO-1003",
    state: "QLD",
    projectName: "Brisbane Tower",
    createdAt: "2026-03-03T09:15:00Z"
  }
];

export const mockTicketItems = [
  { id: 1, ticketId: 101, itemCode: "ITEM-A", description: "Concrete Mix", quantity: 10, unit: "tonnes" },
  { id: 2, ticketId: 101, itemCode: "ITEM-B", description: "Steel Rebar", quantity: 5, unit: "tonnes" },
  { id: 3, ticketId: 102, itemCode: "ITEM-C", description: "Scaffolding", quantity: 200, unit: "pieces" }
];

export const mockMessages = [
  { id: 1, ticketId: 101, senderName: "Alice Smith", text: "Please process this soon.", createdAt: "2026-03-01T10:05:00Z" },
  { id: 2, ticketId: 101, senderName: "Bob Coordinator", text: "Looking into it right now.", createdAt: "2026-03-01T10:15:00Z" }
];
