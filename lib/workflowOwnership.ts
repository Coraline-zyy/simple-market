export function publicationGroup(userId: string | null, publisherId: string | null | undefined) {
  if (!userId || !publisherId) return "unknown";
  return userId === publisherId ? "mine" : "theirs";
}
