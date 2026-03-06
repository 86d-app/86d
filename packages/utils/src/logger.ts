type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
	[key: string]: unknown;
}

function formatMessage(
	level: LogLevel,
	message: string,
	data?: LogPayload,
): string {
	const ts = new Date().toISOString();
	const base = `[${ts}] ${level.toUpperCase()} ${message}`;
	if (data && Object.keys(data).length > 0) {
		return `${base} ${JSON.stringify(data)}`;
	}
	return base;
}

export const logger = {
	debug(message: string, data?: LogPayload) {
		console.debug(formatMessage("debug", message, data));
	},
	info(message: string, data?: LogPayload) {
		console.info(formatMessage("info", message, data));
	},
	warn(message: string, data?: LogPayload) {
		console.warn(formatMessage("warn", message, data));
	},
	error(message: string, data?: LogPayload) {
		console.error(formatMessage("error", message, data));
	},
};
