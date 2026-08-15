import { query } from "./_generated/server";
import { getCurrentUser, isRole } from "./helpers";

/** Full company registry — T&P Cell only. */
export const allCompanies = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const companies = await ctx.db.query("companies").collect();
    const internships = await ctx.db.query("internships").collect();
    return companies
      .map((company) => ({
        ...company,
        internshipCount: internships.filter((i) => i.companyId === company._id).length,
      }))
      .sort((a, b) => {
        const order: Record<string, number> = { pending: 0, verified: 1, rejected: 2, suspended: 3 };
        return (order[a.verificationStatus] ?? 4) - (order[b.verificationStatus] ?? 4);
      });
  },
});
