import { bookAppointment } from "./book-appointment";
import { cancelAppointment } from "./cancel-appointment";
import { getAppointment } from "./get-appointment";
import { getAvailableSlots } from "./get-available-slots";
import { getService } from "./get-service";
import { listServices } from "./list-services";

export const storeEndpoints = {
	"/appointments/services": listServices,
	"/appointments/services/:slug": getService,
	"/appointments/availability": getAvailableSlots,
	"/appointments/book": bookAppointment,
	"/appointments/:id": getAppointment,
	"/appointments/:id/cancel": cancelAppointment,
};
