import { adminCreateCategory } from "./create-category";
import { adminCreateExemption } from "./create-exemption";
import { adminCreateRate } from "./create-rate";
import { adminDeleteCategory } from "./delete-category";
import { adminDeleteExemption } from "./delete-exemption";
import { adminDeleteRate } from "./delete-rate";
import { adminGetRate } from "./get-rate";
import { adminListCategories } from "./list-categories";
import { adminListExemptions } from "./list-exemptions";
import { adminListRates } from "./list-rates";
import { adminUpdateRate } from "./update-rate";

export const adminEndpoints = {
	"/admin/tax/rates": adminListRates,
	"/admin/tax/rates/create": adminCreateRate,
	"/admin/tax/rates/:id": adminGetRate,
	"/admin/tax/rates/:id/update": adminUpdateRate,
	"/admin/tax/rates/:id/delete": adminDeleteRate,
	"/admin/tax/categories": adminListCategories,
	"/admin/tax/categories/create": adminCreateCategory,
	"/admin/tax/categories/:id/delete": adminDeleteCategory,
	"/admin/tax/exemptions": adminListExemptions,
	"/admin/tax/exemptions/create": adminCreateExemption,
	"/admin/tax/exemptions/:id/delete": adminDeleteExemption,
};
