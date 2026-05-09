// modules/news/news.module.js

export default async function initNews(container) {
  if (!container) {
    console.error("News Module: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  try {
    const proxyUrl = 'http://localhost:3001/api/news';
    console.log("Fetching news from:", proxyUrl);

    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`RSS Fetch failed: ${response.status} ${response.statusText}`);
    }

    const xmlString = await response.text();
    
    if (!xmlString) {
      throw new Error("Empty response from proxy");
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML received from feed");
    }

    const items = xmlDoc.querySelectorAll("item");
    const topStories = Array.from(items).slice(0, 5);

    if (topStories.length === 0) {
      const errorChunk = document.createElement("div");
      errorChunk.className = "story-chunk";
      errorChunk.innerHTML = '<div class="story-content"><h3>No stories found</h3><p>Feed unavailable.</p></div>';
      container.appendChild(errorChunk);
      return;
    }

    topStories.forEach(item => {
      const title = item.querySelector("title")?.textContent || "Untitled Story";
      const link = item.querySelector("link")?.textContent || "#";
      const description = item.querySelector("description")?.textContent || "";

      let imgUrl = "https://via.placeholder.com/90x65/000000/00ff41?text=News";

      const mediaContent = item.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "content")[0];
      if (mediaContent) {
        imgUrl = mediaContent.getAttribute("url");
      } 
      else {
        const enclosure = item.querySelector("enclosure");
        if (enclosure && enclosure.getAttribute("type")?.startsWith("image")) {
          imgUrl = enclosure.getAttribute("url");
        } 
        else {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = description;
          const imgTag = tempDiv.querySelector("img");
          if (imgTag) imgUrl = imgTag.src;
        }
      }

      const chunk = document.createElement("div");
      chunk.className = "story-chunk";

      chunk.innerHTML = `
        <img src="${imgUrl}" alt="${title}" class="story-thumb" onerror="this.src='https://via.placeholder.com/90x65/000000/00ff41?text=No+Img'">
        <div class="story-content">
          <h3>${title}</h3>
          <p>${description.replace(/<[^>]*>?/gm, '').substring(0, 120)}...</p>
        </div>
      `;

      chunk.style.cursor = "pointer";
      chunk.onclick = () => window.open(link, "_blank");

      container.appendChild(chunk);
    });

  } catch (error) {
    console.error("News Module Error:", error);
    
    const errorChunk = document.createElement("div");
    errorChunk.className = "story-chunk";
    errorChunk.innerHTML = `
      <div class="story-content">
        <h3 style="color: var(--term-red)">Feed Error</h3>
        <p>Could not load RTÉ news. Check console.</p>
      </div>
    `;
    container.appendChild(errorChunk);
  }
}