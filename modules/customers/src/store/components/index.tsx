"use client";

import type { MDXComponents } from "mdx/types";
import { AccountProfile } from "./account-profile";
import { AddressBook } from "./address-book";
import { LoyaltyCard } from "./loyalty-card";

export default {
	AccountProfile,
	AddressBook,
	LoyaltyCard,
} satisfies MDXComponents;
