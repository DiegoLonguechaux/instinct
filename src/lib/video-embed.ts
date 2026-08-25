/**
 * Convertit une URL "page" classique (YouTube/Vimeo/Dailymotion, telle que
 * collée depuis la barre d'adresse) en URL d'embed utilisable dans une
 * <iframe>. Ne reconnaît que ces 3 plateformes précises (pas d'iframe
 * arbitraire sur n'importe quel domaine) ; renvoie `null` si l'URL est
 * invalide ou ne correspond à aucun format connu.
 */
export function getVideoEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    const embedMatch = parsed.pathname.match(/^\/embed\/([\w-]+)/);
    if (embedMatch) return url;
    return null;
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  // Vimeo
  if (host === "vimeo.com") {
    const match = parsed.pathname.match(/^\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  if (host === "player.vimeo.com") {
    return url;
  }

  // Dailymotion
  if (host === "dailymotion.com") {
    const match = parsed.pathname.match(/^\/video\/([a-zA-Z0-9]+)/);
    return match ? `https://www.dailymotion.com/embed/video/${match[1]}` : null;
  }
  if (host === "dai.ly") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.dailymotion.com/embed/video/${id}` : null;
  }

  return null;
}
