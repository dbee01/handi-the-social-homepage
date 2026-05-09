// modules/weather/weather.view.js

export default class WeatherView {
  constructor(container) {
    this.container = container;
  }

  render(data) {
    if (!this.container) {
      console.error("Weather View: Container is null");
      return;
    }

    const { temperature, condition, area, icon } = data;

    // Render as a single horizontal line for the header
    this.container.innerHTML = `
      <span style="font-size: 1.1rem; font-weight: bold; color: var(--term-white); margin-right: 8px;">
        ${temperature}°C
      </span>
      <span style="font-size: 0.8rem; color: var(--term-amber); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px;">
        ${condition}
      </span>
      <span style="font-size: 0.7rem; color: var(--term-green); border-left: 1px solid #333; padding-left: 8px; margin-left: auto;">
        ${area}
      </span>
    `;
  }
}