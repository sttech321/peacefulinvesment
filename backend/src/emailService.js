import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getEmailAccount(email_account_id) {
  const { data, error } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", email_account_id)
    .single();

  if (error || !data) {
    throw new Error("Email account not found");
  }

  return data;
}

async function createImapClient(account) {
  return new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.imap_secure,
    auth: {
      user: account.email,
      pass: account.password,
    },
  });
}

export async function fetchEmailsForAccount(email_account_id) {
  const account = await getEmailAccount(email_account_id);
  const client = await createImapClient(account);

  const allEmails = [];

  await client.connect();

  // INBOX
  await client.mailboxOpen("INBOX");
  for await (const msg of client.fetch("1:*", { source: true, flags: true, envelope: true })) {
    const parsed = await simpleParser(msg.source);
    const isRead =
      msg.flags instanceof Set
        ? msg.flags.has("\\Seen")
        : Array.isArray(msg.flags)
        ? msg.flags.includes("\\Seen")
        : false;
    allEmails.push({
      uid: msg.uid,
      mailbox: "inbox",
      from: parsed.from?.text || "",
      subject: parsed.subject || "",
      date: parsed.date,
      text: parsed.text || "",
      html: parsed.html || "",
      is_read: isRead,
    });
  }

  // SENT (try common names)
  const sentFolders = ["Sent", "Sent Items", "INBOX.Sent", "INBOX.Sent Items"];

  for (const folder of sentFolders) {
    try {
      await client.mailboxOpen(folder);
      for await (const msg of client.fetch("1:*", { source: true })) {
        const parsed = await simpleParser(msg.source);
        allEmails.push({
          uid: msg.uid,
          mailbox: "sent",
          from: parsed.from?.text || "",
          subject: parsed.subject || "",
          date: parsed.date,
          text: parsed.text || "",
          html: parsed.html || "",
          is_read: true,
        });
      }
      break;
    } catch {
      // try next folder
    }
  }

  await client.logout();

  // Sort latest first
  allEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

  return allEmails;
}
