import { AppLayout } from "~/components/app-layout";

export default function InsecureLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AppLayout>{children}</AppLayout>;
}
