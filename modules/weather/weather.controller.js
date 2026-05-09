// modules/weather/weather.controller.js

export default class WeatherController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async init() {
    try {
      const data = await this.model.fetch();
      this.view.render(data);
    } catch (error) {
      console.error("Weather Controller Error:", error);
      this.view.container.innerHTML = `<span style="color: var(--term-red); font-size: 0.8rem;">Weather Unavailable</span>`;
    }
  }
}