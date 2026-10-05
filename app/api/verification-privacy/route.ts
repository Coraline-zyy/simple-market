import {NextResponse} from "next/server";
import {verificationPrivacy} from "@/lib/verificationPrivacy";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({ready:verificationPrivacy().ready},{headers:{"Cache-Control":"no-store"}})}
