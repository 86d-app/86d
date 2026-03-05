import type { ModuleSchema } from "@86d-app/core";

export const customersSchema = {
	customer: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			email: {
				type: "string",
				required: true,
				unique: true,
			},
			firstName: {
				type: "string",
				required: true,
			},
			lastName: {
				type: "string",
				required: true,
			},
			phone: {
				type: "string",
				required: false,
			},
			dateOfBirth: {
				type: "date",
				required: false,
			},
			metadata: {
				type: "json",
				required: false,
				defaultValue: {},
			},
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
	customerAddress: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			customerId: {
				type: "string",
				required: true,
				references: {
					model: "customer",
					field: "id",
					onDelete: "cascade",
				},
			},
			type: {
				type: ["billing", "shipping"],
				required: true,
				defaultValue: "shipping",
			},
			firstName: {
				type: "string",
				required: true,
			},
			lastName: {
				type: "string",
				required: true,
			},
			company: {
				type: "string",
				required: false,
			},
			line1: {
				type: "string",
				required: true,
			},
			line2: {
				type: "string",
				required: false,
			},
			city: {
				type: "string",
				required: true,
			},
			state: {
				type: "string",
				required: true,
			},
			postalCode: {
				type: "string",
				required: true,
			},
			country: {
				type: "string",
				required: true,
			},
			phone: {
				type: "string",
				required: false,
			},
			isDefault: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
