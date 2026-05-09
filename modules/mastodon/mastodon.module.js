// modules/mastodon/mastodon.module.js

export default async function initMastodon(container) {
  if (!container) {
    console.error("Mastodon Module: Container not found");
    return;
  }

  // --- PRESERVE PIN BUTTON ---
  const pinBtn = container.querySelector('.pin-btn');
  container.innerHTML = '';
  if (pinBtn) container.prepend(pinBtn);
  // ---------------------------

  try {
    const apiUrl = 'http://localhost:3001/api/mastodon';
    console.log("Fetching Mastodon Links from:", apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Mastodon API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw Link Data:", data);

    const links = Array.isArray(data) ? data : [];

    if (links.length === 0) {
      container.innerHTML += '<div class="story-chunk"><div class="story-content"><h3>No links found</h3><p>API returned empty.</p></div></div>';
      return;
    }

    links.forEach((link, index) => {
      const chunk = document.createElement('div');
      chunk.className = 'story-chunk';

      // 1. Title (from link.title)
      const title = link.title || "Untitled Link";

      // 2. Provider Name (Optional subtitle)
      const provider = link.provider_name || link.author_name || "";

      // 3. Image (from link.image)
      const imgUrl = link.image || `https://via.placeholder.com/90x65/000000/00ffff?text=${encodeURIComponent(title.substring(0, 3))}`;

      // 4. Text Excerpt (from link.description)
      // Remove URLs from description
      let rawDesc = link.description || "No description available";
      
      // Strip HTML tags
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawDesc;
      let cleanText = tempDiv.textContent || "";
      
      // Remove URLs
      cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, '').trim();
      
      // Clean whitespace and truncate
      cleanText = cleanText.replace(/\s+/g, ' ').substring(0, 150);

      console.log(`Rendering Link ${index}: "${title}" | Img: ${imgUrl} | Text: ${cleanText}`);

      chunk.innerHTML = `
        <img src="${imgUrl}" alt="${title}" class="story-thumb" onerror="this.src='https://via.placeholder.com/90x65/000000/00ff41?text=No+Img'">
        <div class="story-content">
          <h3>${title}</h3>
          ${provider ? `<small style="color: var(--term-cyan); font-size: 0.75rem; display: block; margin-bottom: 4px;">${provider}</small>` : ''}
          <p>${cleanText || "No description"}</p>
        </div>
      `;

      // Click to open the link
      chunk.style.cursor = 'pointer';
      chunk.onclick = () => {
        if (link.url) window.open(link.url, '_blank');
      };

      container.appendChild(chunk);
    });

  } catch (error) {
    console.error("Mastodon Error:", error);
    container.innerHTML += '<div class="story-chunk"><div class="story-content"><h3 style="color:red">Error</h3><p>' + error.message + '</p></div></div>';
  }
}