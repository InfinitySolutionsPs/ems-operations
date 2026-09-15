import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { ensureDataSheetImported } from "@/lib/datasheet-import";

export async function GET(request: NextRequest) {
  await ensureDataSheetImported(env.DB);
  const access=await getAccess(request); if(access.profile&&!access.profile.active)return NextResponse.json({error:"الحساب موقوف"},{status:403});
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "1900-01-01";
  const to = url.searchParams.get("to") || "2999-12-31";
  const governorate = url.searchParams.get("governorate") || "all";
  const category = url.searchParams.get("category") || "all";
  let where = "approval_status = 'approved' AND call_date BETWEEN ? AND ?";
  const args: unknown[] = [from, to];
  if (governorate !== "all") { where += " AND pickup_governorate = ?"; args.push(governorate); }
  if (category !== "all") { where += " AND category = ?"; args.push(category); }
  if (access.profile?.role==="station_user") { where += " AND station = ?"; args.push(access.profile.station); }
  const queries = [
    env.DB.prepare(`SELECT COUNT(*) total, COUNT(DISTINCT CASE WHEN beneficiary_name IS NOT NULL AND beneficiary_name != '' THEN id END) beneficiaries, ROUND(AVG(NULLIF(response_minutes,0)),1) "avgResponse", ROUND(SUM(distance_km)::numeric,1) distance, SUM(CASE WHEN urgency='Red' OR urgency='حمراء' THEN 1 ELSE 0 END) "redCases" FROM incidents WHERE ${where}`).bind(...args),
    env.DB.prepare(`SELECT pickup_governorate name, COUNT(*) value FROM incidents WHERE ${where} GROUP BY pickup_governorate ORDER BY value DESC`).bind(...args),
    env.DB.prepare(`SELECT category name, COUNT(*) value FROM incidents WHERE ${where} GROUP BY category ORDER BY value DESC`).bind(...args),
    env.DB.prepare(`SELECT substr(call_date,1,7) month, COUNT(*) value FROM incidents WHERE ${where} GROUP BY month ORDER BY month`).bind(...args),
    env.DB.prepare(`SELECT case_type name, COUNT(*) value FROM incidents WHERE ${where} GROUP BY case_type ORDER BY value DESC LIMIT 7`).bind(...args),
    env.DB.prepare(`SELECT station name, COUNT(*) incidents, ROUND(SUM(distance_km)::numeric,1) distance, ROUND(AVG(NULLIF(response_minutes,0)),1) response FROM incidents WHERE ${where} GROUP BY station ORDER BY incidents DESC`).bind(...args),
  ];
  const [summary, governorates, categories, timeline, cases, stations] = await env.DB.batch(queries);
  return NextResponse.json({ summary: summary.results[0] || {}, governorates: governorates.results, categories: categories.results, timeline: timeline.results, cases: cases.results, stations: stations.results });
}
