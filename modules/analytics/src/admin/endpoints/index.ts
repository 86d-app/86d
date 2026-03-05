import { getFunnelEndpoint } from "./get-funnel";
import { getRevenueEndpoint } from "./get-revenue";
import { getRevenueTimeSeriesEndpoint } from "./get-revenue-timeseries";
import { getSalesByProductEndpoint } from "./get-sales-by-product";
import { getSearchAnalyticsEndpoint } from "./get-search-analytics";
import { getStatsEndpoint } from "./get-stats";
import { getTopProductsEndpoint } from "./get-top-products";
import { listEventsEndpoint } from "./list-events";

export const adminEndpoints = {
	"/admin/analytics/events": listEventsEndpoint,
	"/admin/analytics/stats": getStatsEndpoint,
	"/admin/analytics/top-products": getTopProductsEndpoint,
	"/admin/analytics/revenue": getRevenueEndpoint,
	"/admin/analytics/revenue/timeseries": getRevenueTimeSeriesEndpoint,
	"/admin/analytics/funnel": getFunnelEndpoint,
	"/admin/analytics/sales-by-product": getSalesByProductEndpoint,
	"/admin/analytics/search": getSearchAnalyticsEndpoint,
};
