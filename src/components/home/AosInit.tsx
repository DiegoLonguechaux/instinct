"use client";

import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";

/**
 * Initialise AOS (Animate On Scroll) une fois au montage de la homepage.
 * Ne rend rien : ne fait que brancher les animations `data-aos="..."`
 * posées sur les sections.
 */
export function AosInit() {
  useEffect(() => {
    AOS.init({
      duration: 700,
      offset: 80,
      once: true,
    });
  }, []);

  return null;
}
