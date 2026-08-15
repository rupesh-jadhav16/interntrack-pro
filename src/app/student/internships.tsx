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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import {
  MODE_LABELS,
  TYPE_LABELS,
  daysUntil,
  formatDateShort,
  timeAgo,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  Compass,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CompanyLogo, EmptyState, PageHeader, StatusBadge, VerifiedBadge } from "../components/ui";

export default function StudentInternships() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [paid, setPaid] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [city, setCity] = useState("");
  const [domain, setDomain] = useState("all");
  const [sort, setSort] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const listings = useQuery(api.internships.list, {
    search: search || undefined,
    mode: mode !== "all" ? mode : undefined,
    type: type !== "all" ? type : undefined,
    paid: paid !== "all" ? paid === "paid" : undefined,
    verifiedOnly: verifiedOnly || undefined,
    city: city || undefined,
    domain: domain !== "all" ? domain : undefined,
    sort,
  });
  const apply = useMutation(api.applications.apply);
  const toggleSave = useMutation(api.internships.toggleSave);
  const detailData = useQuery(
    api.internships.get,
    detail ? { internshipId: detail as never } : "skip",
  );

  const [applying, setApplying] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const domains = useMemo(() => {
    const set = new Set<string>();
    listings?.forEach((l) => set.add(l.internship.domain));
    return [...set];
  }, [listings]);

  const handleApply = async (id: string) => {
    setApplying(id);
    try {
      await apply({ internshipId: id as never });
      toast.success("Application submitted!", {
        description: "You'll be notified when the company reviews it.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply");
    } finally {
      setApplying(null);
    }
  };

  const handleSave = async (id: string) => {
    setSaving(id);
    try {
      const res = await toggleSave({ internshipId: id as never });
      toast.success(res.saved ? "Saved to bookmarks" : "Removed from bookmarks");
    } finally {
      setSaving(null);
    }
  };

  const FilterSelect = ({
    value,
    onValueChange,
    placeholder,
    items,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    placeholder: string;
    items: Array<{ value: string; label: string }>;
  }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-full bg-white text-[13px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Internship Explorer"
        title="Explore internships"
        subtitle="Search and filter verified internships from partner companies. Save the ones you like, apply in one click."
        actions={
          <Button
            variant="outline"
            className="border-slate-200 bg-white"
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
        }
      />

      {/* Search + primary filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, skill, company…"
              className="h-10 rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <FilterSelect
              value={mode}
              onValueChange={setMode}
              placeholder="Mode"
              items={Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <FilterSelect
              value={type}
              onValueChange={setType}
              placeholder="Type"
              items={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <FilterSelect
              value={sort}
              onValueChange={setSort}
              placeholder="Sort"
              items={[
                { value: "recent", label: "Most recent" },
                { value: "deadline", label: "Ending soon" },
              ]}
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Stipend</p>
              <FilterSelect
                value={paid}
                onValueChange={setPaid}
                placeholder="Stipend"
                items={[
                  { value: "paid", label: "Paid only" },
                  { value: "unpaid", label: "Unpaid only" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Domain</p>
              <FilterSelect
                value={domain}
                onValueChange={setDomain}
                placeholder="All domains"
                items={domains.map((d) => ({ value: d, label: d }))}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">City</p>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" className="h-9 bg-white" />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-slate-700">
                <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                Verified companies only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Listings */}
      {listings === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-52 animate-pulse rounded-xl border-slate-200/80" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No internships match your filters"
          message="Try removing a filter or searching for a different skill or city."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map(({ internship, company, applied, saved }) => (
            <Card
              key={internship._id}
              className="card-elevated group cursor-pointer rounded-xl border-slate-200/80 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"
              onClick={() => setDetail(internship._id as string)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CompanyLogo name={company?.name ?? "?"} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{internship.title}</p>
                      {company?.verificationStatus === "verified" && <VerifiedBadge compact />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{company?.name}</p>
                  </div>
                </div>
                <Badge className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {TYPE_LABELS[internship.type] ?? internship.type}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {internship.city}</span>
                <span className="flex items-center gap-1"><Briefcase className="size-3.5" /> {MODE_LABELS[internship.mode]}</span>
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> {internship.duration}</span>
                <span className={cn("flex items-center gap-1 font-semibold", internship.paid ? "text-emerald-600" : "text-slate-500")}>
                  <Wallet className="size-3.5" /> {internship.stipend}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {internship.skills.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                <div className="text-[11px] text-slate-400">
                  <p>Posted {timeAgo(internship.postedAt)}</p>
                  <p className="font-semibold text-slate-600">Ends in {daysUntil(internship.deadline)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave(internship._id as string);
                    }}
                    disabled={saving === internship._id}
                  >
                    {saved || saving === internship._id ? (
                      <BookmarkCheck className="size-4 text-indigo-600" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
                    {saved ? "Saved" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={applied || applying === internship._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(internship._id as string);
                    }}
                  >
                    {applying === internship._id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : applied ? (
                      "Applied ✓"
                    ) : (
                      "Apply Now"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          {detailData && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <CompanyLogo name={detailData.company?.name ?? "?"} size="lg" />
                  <div>
                    <DialogTitle className="text-lg">{detailData.internship.title}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      {detailData.company?.name}
                      {detailData.company?.verificationStatus === "verified" && <VerifiedBadge compact />}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3.5 text-[12px] sm:grid-cols-3">
                  <div><p className="text-slate-400">Location</p><p className="font-semibold text-slate-700">{detailData.internship.city}</p></div>
                  <div><p className="text-slate-400">Mode</p><p className="font-semibold text-slate-700">{MODE_LABELS[detailData.internship.mode]}</p></div>
                  <div><p className="text-slate-400">Duration</p><p className="font-semibold text-slate-700">{detailData.internship.duration}</p></div>
                  <div><p className="text-slate-400">Stipend</p><p className="font-semibold text-emerald-600">{detailData.internship.stipend}</p></div>
                  <div><p className="text-slate-400">Domain</p><p className="font-semibold text-slate-700">{detailData.internship.domain}</p></div>
                  <div><p className="text-slate-400">Deadline</p><p className="font-semibold text-slate-700">{formatDateShort(detailData.internship.deadline)}</p></div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">About the role</p>
                  <p className="text-sm leading-6 text-slate-600">{detailData.internship.description}</p>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailData.internship.skills.map((s) => (
                      <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{s}</span>
                    ))}
                  </div>
                </div>
                {detailData.company && (
                  <div className="rounded-xl border border-slate-100 p-3.5">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-emerald-500" />
                      <p className="text-[13px] font-bold text-slate-800">{detailData.company.name}</p>
                      <StatusBadge
                        label={detailData.company.verificationStatus === "verified" ? "Verified" : detailData.company.verificationStatus}
                        className={detailData.company.verificationStatus === "verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}
                        dotClass={detailData.company.verificationStatus === "verified" ? "bg-emerald-500" : "bg-amber-500"}
                      />
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">{detailData.company.description}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" onClick={() => handleSave(detailData.internship._id as string)}>
                  <Bookmark className="size-4" /> Save
                </Button>
                <Button
                  disabled={detailData.internship.status !== "open"}
                  onClick={() => {
                    handleApply(detailData.internship._id as string);
                    setDetail(null);
                  }}
                >
                  <BadgeCheck className="size-4" /> Apply for this internship
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
