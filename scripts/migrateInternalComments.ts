import { db } from "../server/db";
import { tickets, ticketMessages, users } from "../shared/schema";
import { sql, isNotNull, ne, and } from "drizzle-orm";

async function main() {
  const allUsers = await db.select().from(users);
  const userMap = new Map<string, number>();
  for (const u of allUsers) {
    const first = (u.firstName || "").toLowerCase();
    const last = (u.lastName || "").toLowerCase();
    const full = `${first} ${last}`.trim();
    if (first) userMap.set(first, u.id);
    if (full) userMap.set(full, u.id);
  }

  const adminUser = allUsers.find(u => u.role === "ADMIN") || allUsers[0];
  const fallbackUserId = adminUser.id;

  const rows = await db
    .select({ id: tickets.id, legacyId: tickets.legacyId, ic: tickets.internalComments })
    .from(tickets)
    .where(and(isNotNull(tickets.internalComments), ne(tickets.internalComments, "")));

  console.log(`Found ${rows.length} tickets with internal comments`);

  const commentPattern = /^(\w+(?:\s\w+)?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M):\s*/;

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const row of rows) {
    const rawText = (row.ic || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = rawText.split("\n");

    const parsedMessages: { name: string; date: string; time: string; text: string }[] = [];

    for (const line of lines) {
      const match = line.match(commentPattern);
      if (match) {
        parsedMessages.push({
          name: match[1],
          date: match[2],
          time: match[3],
          text: line.substring(match[0].length),
        });
      } else if (parsedMessages.length > 0 && line.trim()) {
        parsedMessages[parsedMessages.length - 1].text += "\n" + line;
      }
    }

    if (parsedMessages.length === 0 && rawText.trim()) {
      parsedMessages.push({
        name: "System",
        date: "01/01/2026",
        time: "12:00 AM",
        text: rawText.trim(),
      });
    }

    for (const msg of parsedMessages) {
      const senderName = msg.name.toLowerCase();
      const senderUserId = userMap.get(senderName) || fallbackUserId;

      const [month, day, year] = msg.date.split("/");
      const timeMatch = msg.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      let hours = 0, minutes = 0;
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
      }
      const createdAt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);

      if (msg.text.trim()) {
        await db.insert(ticketMessages).values({
          ticketId: row.id,
          senderUserId,
          messageText: `[Legacy] ${msg.text.trim()}`,
          createdAt,
        });
        totalInserted++;
      }
    }
  }

  console.log(`Inserted ${totalInserted} messages, skipped ${totalSkipped}`);
  console.log("Done migrating internal comments to chat messages");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
