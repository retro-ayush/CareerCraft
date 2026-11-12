import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register the custom type scale and radii so they are not mistaken for colours and dropped when merged.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "body", "small", "stat"] }],
      rounded: [{ rounded: ["input", "card", "panel"] }],
    },
  },
});

/** Merges class names, letting later Tailwind utilities override earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
