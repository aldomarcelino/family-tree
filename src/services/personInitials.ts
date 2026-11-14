export function getPersonInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words.length === 1 ? Array.from(words[0]).slice(0, 2).join("") :
    words.slice(0, 2).map((word) => Array.from(word)[0]).join("")).toLocaleUpperCase("id-ID");
}
