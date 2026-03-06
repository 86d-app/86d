import { getStoreConfig } from "@86d-app/sdk";
import { AppLayout } from "~/components/app-layout";
import { resolveTemplatePath } from "~/lib/template-path";

export default async function InsecureLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const config = await getStoreConfig({
		templatePath: resolveTemplatePath(),
		fallbackToTemplateOnError: true,
	});
	return <AppLayout config={config}>{children}</AppLayout>;
}
