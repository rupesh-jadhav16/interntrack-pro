import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getCurrentUser,
  isRole,
  logActivity,
  notify,
  requireRole,
  requireUser,
} from "./helpers";

/** Deterministic AI-assisted authenticity scoring (no false claims of
 *  AI-guaranteed authenticity — admins always review suspicious docs). */
export function scoreCertificate(input: {
  companyName: string;
  fileName?: string;
  details: string;
  companyExists: boolean;
  companyVerified: boolean;
  matchesEnrollment: boolean;
}) {
  let score = 40;
  const indicators: string[] = [];
  const lowerName = (input.fileName ?? "").toLowerCase();
  const lowerDetails = input.details.toLowerCase();

  if (input.companyExists) {
    score += 20;
    if (input.companyVerified) {
      score += 15;
    } else {
      indicators.push("Company exists in registry but is not yet verified");
    }
  } else {
    indicators.push("Company not found in the verified registry");
  }
  if (input.matchesEnrollment) {
    score += 15;
  } else {
    indicators.push("Certificate company does not match any tracked internship");
  }
  if (/certificate|offer|completion|experience|letter/i.test(lowerName)) {
    score += 10;
  } else {
    indicators.push("File name does not look like an official document");
  }
  if (
    /template|paid|buy|purchase|fake|sample|urgent|instant/i.test(
      lowerDetails,
    ) ||
    /template|paid|buy|purchase|fake|sample/i.test(lowerName)
  ) {
    score -= 30;
    indicators.push("Document mentions a template or paid service");
  }
  if (input.details.length < 20) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  const status: "verified" | "requires_review" | "suspicious" =
    score >= 80 ? "verified" : score >= 55 ? "requires_review" : "suspicious";
  return { score, status, indicators };
}

export const submit = mutation({
  args: {
    type: v.union(
      v.literal("offer"),
      v.literal("completion"),
      v.literal("experience"),
      v.literal("other"),
    ),
    companyName: v.string(),
    fileName: v.optional(v.string()),
    url: v.optional(v.string()),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");

    const companies = await ctx.db.query("companies").collect();
    const company = companies.find(
      (c) => c.name.toLowerCase() === args.companyName.toLowerCase(),
    );
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .filter((q) =>
        q.eq(q.field("companyName"), args.companyName),
      )
      .first();

    const { score, status, indicators } = scoreCertificate({
      companyName: args.companyName,
      fileName: args.fileName,
      details: args.details,
      companyExists: !!company,
      companyVerified: company?.verificationStatus === "verified",
      matchesEnrollment: !!enrollment,
    });

    const certificateId = await ctx.db.insert("certificates", {
      studentId: student._id,
      enrollmentId: enrollment?._id,
      type: args.type,
      companyName: args.companyName,
      fileName: args.fileName,
      url: args.url,
      uploadedAt: Date.now(),
      verificationStatus: status,
      authenticityScore: score,
      suspiciousIndicators: indicators,
      details: args.details,
      adminReviewed: false,
    });

    await logActivity(
      ctx,
      user,
      "certificate.submit",
      `Submitted ${args.type} certificate for ${args.companyName}`,
    );
    await notify(
      ctx,
      user._id,
      status === "verified" ? "Certificate verified ✓" : "Certificate under review",
      status === "verified"
        ? `Your ${args.companyName} certificate scored ${score}/100 and was auto-verified.`
        : `Your ${args.companyName} certificate scored ${score}/100. ${status === "suspicious" ? "It was flagged as potentially suspicious and sent to the T&P review queue." : "It needs a quick manual review by the T&P Cell."}`,
      status === "verified" ? "success" : status === "suspicious" ? "error" : "warning",
      "/app/certificates",
    );
    return { certificateId, score, status, indicators };
  },
});

export const myCertificates = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    return await ctx.db
      .query("certificates")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
  },
});

export const allCertificates = query({
  args: { queueOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const certificates = await ctx.db.query("certificates").collect();
    const result = [];
    for (const certificate of certificates.sort(
      (a, b) => b.uploadedAt - a.uploadedAt,
    )) {
      const student = await ctx.db.get(certificate.studentId);
      if (!args.queueOnly || certificate.verificationStatus !== "verified") {
        result.push({ certificate, student });
      }
    }
    return result;
  },
});

export const reviewCertificate = mutation({
  args: {
    certificateId: v.id("certificates"),
    action: v.union(v.literal("approve"), v.literal("flag")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { certificateId, action, notes }) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);
    const certificate = await ctx.db.get(certificateId);
    if (!certificate) throw new Error("Certificate not found");
    const status = action === "approve" ? "verified" : "suspicious";
    const score = action === "approve" ? Math.max(certificate.authenticityScore, 80) : certificate.authenticityScore;
    await ctx.db.patch(certificateId, {
      verificationStatus: status,
      authenticityScore: score,
      adminReviewed: true,
      details: notes ? `${certificate.details} — Admin review: ${notes}` : certificate.details,
      suspiciousIndicators:
        action === "approve"
          ? certificate.suspiciousIndicators
          : [...certificate.suspiciousIndicators, "Flagged by T&P Cell review"],
    });
    const student = await ctx.db.get(certificate.studentId);
    if (student?.userId) {
      await notify(
        ctx,
        student.userId,
        action === "approve" ? "Certificate verified by T&P Cell 🛡️" : "Certificate flagged by T&P Cell",
        action === "approve"
          ? `Your ${certificate.companyName} certificate has been verified by the T&P Cell.`
          : `Your ${certificate.companyName} certificate requires re-submission — please contact the T&P Cell.`,
        action === "approve" ? "success" : "error",
        "/app/certificates",
      );
    }
    await logActivity(
      ctx,
      user,
      "certificate.review",
      `${action === "approve" ? "Approved" : "Flagged"} certificate for ${certificate.companyName}`,
    );
    return { ok: true };
  },
});
