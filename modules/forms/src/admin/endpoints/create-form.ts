import { createAdminEndpoint, z } from "@86d-app/core";
import type { FormsController } from "../../service";

const fieldSchema = z.object({
	name: z.string().min(1),
	label: z.string().min(1),
	type: z.enum([
		"text",
		"email",
		"textarea",
		"number",
		"phone",
		"select",
		"radio",
		"checkbox",
		"date",
		"url",
		"hidden",
	]),
	required: z.boolean(),
	placeholder: z.string().optional(),
	defaultValue: z.string().optional(),
	options: z.array(z.string()).optional(),
	pattern: z.string().optional(),
	min: z.number().optional(),
	max: z.number().optional(),
	position: z.number(),
});

export const createForm = createAdminEndpoint(
	"/admin/forms/create",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1),
			slug: z.string().min(1),
			description: z.string().optional(),
			fields: z.array(fieldSchema).optional(),
			submitLabel: z.string().optional(),
			successMessage: z.string().optional(),
			notifyEmail: z.string().email().optional(),
			honeypotEnabled: z.boolean().optional(),
			maxSubmissions: z.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const form = await formsController.createForm(ctx.body);

		return { form };
	},
);
