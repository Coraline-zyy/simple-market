import { supabase } from "@/lib/supabaseClient";

export async function getOrCreateConversation(args: {
  targetType: "service" | "demand";
  targetId: string;
  me: string;      // 当前用户 id
  other: string;   // 对方用户 id（发布者）
}) {
  const { targetType, targetId, me, other } = args;

  // 先查是否已存在（A-B 或 B-A）
  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .or(`and(user1_id.eq.${me},user2_id.eq.${other}),and(user1_id.eq.${other},user2_id.eq.${me})`)
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    return existing.data.id as string;
  }

  // 不存在则插入（可能并发撞 unique，撞了再查一次）
  const ins = await supabase
    .from("conversations")
    .insert({
      target_type: targetType,
      target_id: targetId,
      user1_id: me,
      user2_id: other,
    })
    .select("id")
    .maybeSingle();

  if (!ins.error && ins.data?.id) return ins.data.id as string;

  // 如果插入失败（可能 unique 冲突），再查一次兜底
  const again = await supabase
    .from("conversations")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .or(`and(user1_id.eq.${me},user2_id.eq.${other}),and(user1_id.eq.${other},user2_id.eq.${me})`)
    .maybeSingle();

  if (!again.error && again.data?.id) return again.data.id as string;

  throw new Error(ins.error?.message || existing.error?.message || "无法创建会话");
}
