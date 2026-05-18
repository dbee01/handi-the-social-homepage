/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/weather/weather.module.js
import M from "./weather.model.js";
import V from "./weather.view.js";
import C from "./weather.controller.js";

export default (c) => {
  if (!c) throw new Error("Container is required");
  const controller = new C(new M(), new V(c));
  controller.init();
  return controller;
};