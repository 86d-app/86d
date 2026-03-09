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

export const updateForm = createAdminEndpoint(
	"/admin/forms/:id/update",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
		body: z.object({
			name: z.string().min(1).optional(),
			slug: z.string().min(1).optional(),
			description: z.string().optional(),
			fields: z.array(fieldSchema).optional(),
			submitLabel: z.string().optional(),
			successMessage: z.string().optional(),
			isActive: z.boolean().optional(),
			notifyEmail: z.string().email().optional(),
			honeypotEnabled: z.boolean().optional(),
			maxSubmissions: z.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const form = await formsController.updateForm(ctx.params.id, ctx.body);

		return { form };
	},
);
