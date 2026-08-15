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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { AlertTriangle, GraduationCap, Search, UserCog } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";
import { Input } from "@/components/ui/input";

export default function AdminStudents() {
  const students = useQuery(api.admin.allStudents);
  const faculty = useQuery(api.admin.allFaculty);
  const assign = useMutation(api.admin.assignFaculty);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [mentor, setMentor] = useState<string>("none");

  const filtered = (students ?? []).filter(
    (s) =>
      !search ||
      s.student.name.toLowerCase().includes(search.toLowerCase()) ||
      s.student.department.toLowerCase().includes(search.toLowerCase()) ||
      s.student.branch.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAssign = async () => {
    if (!selected) return;
    try {
      await assign({
        studentId: selected as never,
        facultyId: mentor !== "none" ? (mentor as never) : undefined,
      });
      toast.success("Mentor assigned");
      setSelected(null);
      setMentor("none");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Students"
        title="All students"
        subtitle="Every student in the college — their internship status, engagement and assigned faculty mentor."
      />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students…" className="h-10 rounded-xl bg-white pl-9" />
      </div>

      {students === undefined ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Card key={i} className="h-16 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No students found" />
      ) : (
        <Card className="card-elevated overflow-hidden rounded-xl border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Internship</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">Reports</th>
                  <th className="px-4 py-3 font-semibold">Mentor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.student._id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-[11px] font-bold text-white">
                          {s.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{s.student.name}</p>
                          <p className="text-[11px] text-slate-400">Year {s.student.year} · CGPA {s.student.cgpa}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.student.branch} · {s.student.department.split(" ")[0]}</td>
                    <td className="px-4 py-3">
                      {s.activeEnrollment ? (
                        <div>
                          <p className="font-semibold text-emerald-700">{s.activeEnrollment.companyName}</p>
                          <p className="text-[11px] text-slate-400">{s.activeEnrollment.role}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-medium text-slate-400">
                          None
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{s.attendancePct}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{s.reportCount}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{s.faculty?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-slate-200 bg-white" onClick={() => setSelected(s.student._id as string)}>
                            <UserCog className="size-3.5" /> Assign mentor
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-2xl">
                          <DialogHeader>
                            <DialogTitle>Assign faculty mentor</DialogTitle>
                            <DialogDescription>Faculty mentors monitor attendance, reports and streaks for their assigned students.</DialogDescription>
                          </DialogHeader>
                          <Select value={mentor} onValueChange={setMentor}>
                            <SelectTrigger><SelectValue placeholder="Choose a mentor" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassign</SelectItem>
                              {(faculty ?? []).map((f) => (
                                <SelectItem key={f.faculty._id} value={f.faculty._id as string}>
                                  {f.faculty.name} · {f.faculty.department}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <DialogFooter>
                            <Button onClick={handleAssign}>Assign mentor</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
