import express from "express";
import { inventoryRouter } from "./routes/inventory";
import { webhookRouter } from "./routes/webhooks";

const app = express();
app.use(express.json());
app.use("/api/inventory", inventoryRouter);
app.use("/api/webhooks", webhookRouter);

app.listen(3000, () => console.log("Inventory API running on :3000"));
