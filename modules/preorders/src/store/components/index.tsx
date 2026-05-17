"use client";

import type { MDXComponents } from "mdx/types";
import { CampaignDetail } from "./campaign-detail";
import { CampaignList } from "./campaign-list";
import { MyPreorders } from "./my-preorders";
import { PreorderButton } from "./preorder-button";

export { CampaignDetail, CampaignList, MyPreorders, PreorderButton };

export default {
	CampaignDetail,
	CampaignList,
	MyPreorders,
	PreorderButton,
} satisfies MDXComponents;
