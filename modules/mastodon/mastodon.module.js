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
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Mastodon API failed: ${response.status}`);
    }

    const data = await response.json();
    const trends = Array.isArray(data) ? data : [];

    if (trends.length === 0) {
      const errorChunk = document.createElement('div');
      errorChunk.className = 'story-chunk';
      errorChunk.innerHTML = '<div class="story-content"><h3>No trends found</h3><p>Try again later.</p></div>';
      container.appendChild(errorChunk);
      return;
    }

    trends.forEach((trend, index) => {
      const chunk = document.createElement('div');
      chunk.className = 'story-chunk';

      // 1. Extract Title (Account display name or username)
      const title = trend.account?.display_name || trend.account?.username || `Trend #${index + 1}`;
      
      // 2. Process Content: Remove URLs and Extract Images
      let cleanText = trend.content || "No content available";
      let extractedImg = null;

      // Create a temporary DOM element to parse the HTML content safely
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanText;

      // A. Extract Image
      const imgTag = tempDiv.querySelector('img');
      if (imgTag) {
        extractedImg = imgTag.src;
        // Remove the image from the text content so it doesn't appear twice
        imgTag.remove();
      }

      // B. Remove URLs from text
      // Regex matches http/https URLs and removes them
      cleanText = tempDiv.textContent || "";
      cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, '').trim();
      
      // Clean up extra whitespace caused by removing URLs
      cleanText = cleanText.replace(/\s+/g, ' ').substring(0, 150); // Truncate if too long

      // 3. Determine Thumbnail
      const imgUrl = extractedImg || `https://via.placeholder.com/90x65/000000/00ffff?text=${encodeURIComponent(title.substring(0, 3))}`;

      chunk.innerHTML = `
        <img src="${imgUrl}" alt="${title}" class="story-thumb">
        <div class="story-content">
          <h3>${title}</h3>
          <p>${cleanText}</p>
        </div>
      `;

      // Optional: Click to open original post
      chunk.style.cursor = 'pointer';
      chunk.onclick = () => {
        if (trend.url) window.open(trend.url, '_blank');
      };

      container.appendChild(chunk);
    });

  } catch (error) {
    console.error("Mastodon Module Error:", error);
    
    const errorChunk = document.createElement('div');
    errorChunk.className = 'story-chunk';
    errorChunk.innerHTML = `
      <div class="story-content">
        <h3 style="color: var(--term-red)">Connection Failed</h3>
        <p>Unable to load Mastodon trends.</p>
      </div>
    `;
    container.appendChild(errorChunk);
  }
}