import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader } from "../components/ui";

export default function AdminAnnouncements() {
  const announcements = useQuery(api.notifications.announcements);
  const announce = useMutation(api.notifications.announce);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [busy, setBusy] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await announce({ title, message, audience });
      toast.success(`Announcement sent to ${res.delivered} users`);
      setTitle("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Announcements"
        title="Send announcements"
        subtitle="Broadcast messages to everyone or to a specific role. Recipients get a notification instantly."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Megaphone className="size-4 text-indigo-600" /> New announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Placement drive — Fall semester" required />
              </Field>
              <Field label="Message">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Details of the announcement…" required />
              </Field>
              <Field label="Audience">
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="student">Students only</SelectItem>
                    <SelectItem value="faculty">Faculty only</SelectItem>
                    <SelectItem value="company">Companies only</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
                Send announcement
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Previous announcements</p>
          {announcements === undefined ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <Card key={i} className="h-20 animate-pulse rounded-xl border-slate-200/80" />)}</div>
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements yet" />
          ) : (
            <div className="space-y-2.5">
              {announcements.map((a) => (
                <Card key={a._id} className="rounded-xl border-slate-200/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">📢 {a.title}</p>
                    <span className="text-[11px] text-slate-400">{formatDate(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-slate-600">{a.message}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Audience: {a.audience === "all" ? "Everyone" : a.audience} · by {a.createdBy}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}
