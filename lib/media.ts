import { supabase } from "@/lib/supabaseClient";

export const POST_IMAGES_BUCKET = "post-images";
export const AVATARS_BUCKET = "avatars";
export const MAX_POST_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "jpg";
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadPostImages(userId: string, postType: "service" | "demand" | "forum-post" | "forum-comment", postId: string, files: File[]) {
  const accepted = files.slice(0, MAX_POST_IMAGES);
  const paths: string[] = [];
  try {
  for (let index = 0; index < accepted.length; index += 1) {
    const file = accepted[index];
    if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Each image must be 5 MB or smaller.");
    const path = `${userId}/${postType}/${postId}/${Date.now()}-${index}.${extensionFor(file)}`;
    const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type,
    });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
  } catch (error) {
    if (paths.length) await supabase.storage.from(POST_IMAGES_BUCKET).remove(paths);
    throw error;
  }
}

export async function uploadAvatar(userId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Avatar must be 5 MB or smaller.");
  const path = `${userId}/avatar-${Date.now()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}
