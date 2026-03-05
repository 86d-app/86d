import { addRate } from "./add-rate";
import { createZone } from "./create-zone";
import { deleteRate } from "./delete-rate";
import { deleteZone } from "./delete-zone";
import { listRates } from "./list-rates";
import { listZones } from "./list-zones";
import { updateRate } from "./update-rate";
import { updateZone } from "./update-zone";

export const adminEndpoints = {
	"/admin/shipping/zones": listZones,
	"/admin/shipping/zones/create": createZone,
	"/admin/shipping/zones/:id/update": updateZone,
	"/admin/shipping/zones/:id/delete": deleteZone,
	"/admin/shipping/zones/:id/rates": listRates,
	"/admin/shipping/zones/:id/rates/add": addRate,
	"/admin/shipping/rates/:id/update": updateRate,
	"/admin/shipping/rates/:id/delete": deleteRate,
};
