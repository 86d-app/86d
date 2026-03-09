import type { ModuleController } from "@86d-app/core";

// ── Entities ───────────────────────────────────────────────────────

export interface DeliverySchedule {
	id: string;
	name: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
	capacity: number;
	surchargeInCents: number;
	active: boolean;
	sortOrder: number;
	createdAt: Date;
	updatedAt: Date;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface DeliveryBooking {
	id: string;
	scheduleId: string;
	deliveryDate: string;
	orderId: string;
	customerId?: string;
	scheduleName: string;
	startTime: string;
	endTime: string;
	surchargeInCents: number;
	status: BookingStatus;
	instructions?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface DeliveryBlackout {
	id: string;
	date: string;
	reason?: string;
	createdAt: Date;
}

// ── Input params ───────────────────────────────────────────────────

export interface CreateScheduleParams {
	name: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
	capacity: number;
	surchargeInCents?: number;
	active?: boolean;
	sortOrder?: number;
}

export interface UpdateScheduleParams {
	name?: string;
	dayOfWeek?: number;
	startTime?: string;
	endTime?: string;
	capacity?: number;
	surchargeInCents?: number;
	active?: boolean;
	sortOrder?: number;
}

export interface BookSlotParams {
	scheduleId: string;
	deliveryDate: string;
	orderId: string;
	customerId?: string;
	instructions?: string;
}

export interface ListSchedulesParams {
	dayOfWeek?: number;
	active?: boolean;
	take?: number;
	skip?: number;
}

export interface ListBookingsParams {
	deliveryDate?: string;
	orderId?: string;
	customerId?: string;
	status?: BookingStatus;
	take?: number;
	skip?: number;
}

export interface CreateBlackoutParams {
	date: string;
	reason?: string;
}

export interface AvailableSlotsParams {
	date: string;
}

// ── Results ────────────────────────────────────────────────────────

export interface SlotAvailability {
	schedule: DeliverySchedule;
	date: string;
	booked: number;
	remaining: number;
	available: boolean;
}

export interface DeliverySlotsSummary {
	totalSchedules: number;
	activeSchedules: number;
	totalBookings: number;
	confirmedBookings: number;
	cancelledBookings: number;
	totalSurchargeRevenue: number;
	blackoutDates: number;
}

// ── Controller ─────────────────────────────────────────────────────

export interface DeliverySlotsController extends ModuleController {
	// Schedule CRUD
	createSchedule(params: CreateScheduleParams): Promise<DeliverySchedule>;
	updateSchedule(
		id: string,
		params: UpdateScheduleParams,
	): Promise<DeliverySchedule | null>;
	getSchedule(id: string): Promise<DeliverySchedule | null>;
	listSchedules(params?: ListSchedulesParams): Promise<DeliverySchedule[]>;
	deleteSchedule(id: string): Promise<boolean>;

	// Booking management
	bookSlot(params: BookSlotParams): Promise<DeliveryBooking>;
	cancelBooking(id: string): Promise<DeliveryBooking | null>;
	getBooking(id: string): Promise<DeliveryBooking | null>;
	getOrderBooking(orderId: string): Promise<DeliveryBooking | null>;
	listBookings(params?: ListBookingsParams): Promise<DeliveryBooking[]>;

	// Availability
	getAvailableSlots(params: AvailableSlotsParams): Promise<SlotAvailability[]>;
	getSlotBookingCount(scheduleId: string, date: string): Promise<number>;

	// Blackout dates
	createBlackout(params: CreateBlackoutParams): Promise<DeliveryBlackout>;
	deleteBlackout(id: string): Promise<boolean>;
	listBlackouts(): Promise<DeliveryBlackout[]>;
	isBlackoutDate(date: string): Promise<boolean>;

	// Analytics
	getSummary(): Promise<DeliverySlotsSummary>;
}
