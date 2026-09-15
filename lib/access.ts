import { env } from "@/lib/server-env";
import { NextRequest } from "next/server";

export type AccessProfile = { id:number; role:string; station:string|null; active:number; email:string|null };
export async function getAccess(request:NextRequest){const externalId=request.headers.get("oai-authenticated-user-id")||"local-admin";const email=request.headers.get("oai-authenticated-user-email")||"admin@prcs.local";const profile=await env.DB.prepare("SELECT id,role,station,active,email FROM user_profiles WHERE external_user_id=? OR email=? LIMIT 1").bind(externalId,email).first<AccessProfile>();return {externalId,email,profile};}
export function canEnter(role?:string){return role==="admin"||role==="central_user"||role==="station_user";}
