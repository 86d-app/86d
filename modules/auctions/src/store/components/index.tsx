import type { MDXComponents } from "mdx/types";
import { AuctionListing } from "./auction-listing";
import { AuctionPage } from "./auction-page";

export { AuctionListing, AuctionPage };

export default {
	AuctionListing,
	AuctionPage,
} satisfies MDXComponents;
