import { hero_nav_clr } from "./js/hero/nav.js";
import { hero_nav_scroll } from "./js/hero/nav.js";
import { sphere } from "./js/hero/sphere.js";
import { hero_vis_scroll } from "./js/hero/visual.js";
import { logoIdentifier } from "./js/hero/socials.js";

export function components_wrpd () {
    hero_nav_clr();
    hero_nav_scroll();
    sphere();
    hero_vis_scroll();
    logoIdentifier();
}
