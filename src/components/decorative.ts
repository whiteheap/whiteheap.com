import { createElement } from "react";
import type { Icon } from "@phosphor-icons/react";

/**
 * A Phosphor icon for a Kumo button whose words or aria-label already say
 * what it does. Kumo renders a component passed as `icon` with no props, so
 * pass it through here: screen readers skip the icon instead of reading an
 * unnamed image before the label.
 */
export const decorative = (icon: Icon) => createElement(icon, { "aria-hidden": true });
