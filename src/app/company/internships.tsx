import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { MODE_LABELS, TYPE_LABELS, daysUntil, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Briefcase, Loader2, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, VerifiedBadge } from "../components/ui";

export default function CompanyInternships() {
  const internships = useQuery(api.internships.myCompanyInternships);
  const company = useQuery(api.profiles.myCompanyProfile);
  const create = useMutation(api.internships.create);
  const close = useMutation(api.internships.close);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState("remote");
  const [type, setType] = useState("fulltime");
  const [paid, setPaid] = useState("paid");
  const [stipend, setStipend] = useState("");
  const [duration, setDuration] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("14");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        title,
        description,
        domain,
        mode: mode as never,
        type: type as never,
        paid: paid === "paid",
        stipend,
        duration,
        city,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        deadlineDays: Number(deadlineDays),
      });
      toast.success("Internship posted!");
      setOpen(false);
      setTitle(""); setDescription(""); setDomain(""); setStipend(""); setDuration(""); setCity(""); setSkills("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await close({ internshipId: id as never });
      toast.success("Internship closed to new applications");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Internships"
        title="My internships"
        subtitle="Post roles, track applications per listing and close listings when you've found your cohort."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Post internship
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>Post a new internship</DialogTitle>
                <DialogDescription>
                  {company?.verificationStatus === "verified"
                    ? "Your ✓ Verified badge will appear on this listing."
                    : "Your listing is live now. The ✓ Verified badge appears once the T&P Cell verifies your company."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <Field label="Title">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Developer Intern" required />
                </Field>
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will the intern do?" required />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Domain">
                    <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Software Engineering" required />
                  </Field>
                  <Field label="City / location">
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Remote or city" required />
                  </Field>
                  <Field label="Mode">
                    <Select value={mode} onValueChange={setMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MODE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Type">
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Stipend">
                    <Select value={paid} onValueChange={setPaid}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Stipend details">
                    <Input value={stipend} onChange={(e) => setStipend(e.target.value)} placeholder="$2,500 / mo or ₹20,000 / mo" required />
                  </Field>
                  <Field label="Duration">
                    <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="4 months" required />
                  </Field>
                  <Field label="Application deadline (days)">
                    <Input type="number" min="1" max="90" value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} required />
                  </Field>
                </div>
                <Field label="Required skills (comma separated)">
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, SQL" required />
                </Field>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Briefcase className="size-4" />} Post internship
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {internships === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">{[...Array(3)].map((_, i) => <Card key={i} className="h-44 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : internships.length === 0 ? (
        <EmptyState icon={Briefcase} title="No internships yet" message="Post your first internship to start receiving applications." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {internships.map(({ internship, applicationCount }) => (
            <Card key={internship._id} className="card-elevated rounded-xl border-slate-200/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{internship.title}</p>
                    {company?.verificationStatus === "verified" && <VerifiedBadge compact />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{internship.domain} · {internship.city}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-full text-[10px] font-semibold ${internship.status === "open" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                >
                  {internship.status === "open" ? "Open" : "Closed"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {MODE_LABELS[internship.mode]}</span>
                <span>{TYPE_LABELS[internship.type]}</span>
                <span className="font-semibold text-emerald-600">{internship.stipend}</span>
                <span>{internship.duration}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="text-[11px] text-slate-400">
                  <p>Posted {formatDate(internship.postedAt)} · Deadline {daysUntil(internship.deadline)}</p>
                  <p className="mt-0.5 font-bold text-indigo-600">{applicationCount} applications</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="border-slate-200 bg-white">
                    <a href="/app/applications">View applicants</a>
                  </Button>
                  {internship.status === "open" && (
                    <Button size="sm" variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={() => handleClose(internship._id as string)}>
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
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
