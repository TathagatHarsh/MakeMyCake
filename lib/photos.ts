/**
 * Photographs of cakes this kitchen has actually delivered, shown on the review
 * page next to the render so the customer can calibrate their expectations.
 *
 * This list is deliberately empty. Putting stock photography here and labelling
 * it "cakes we've delivered" would be a lie, and the whole point of the review
 * page is that it can be trusted. Drop real files into /public/photos and add
 * them here; the section appears on its own once there is something true to
 * show.
 */
export interface BakeryPhoto {
  src: string;
  alt: string;
  /** What was actually ordered, so the render can be compared like for like. */
  caption: string;
}

export const DELIVERED_PHOTOS: BakeryPhoto[] = [];
