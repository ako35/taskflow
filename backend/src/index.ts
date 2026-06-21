import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.get("/tasks", async (req, res) => {
  const tasks = await prisma.task.findMany();
  res.json(tasks);
});

app.get("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

app.post("/tasks", async (req, res) => {
  const { title, vehicle, customer, area, responsible, description, status } = req.body;
  const task = await prisma.task.create({ data: { title, vehicle, customer, area, responsible, description, status } });
  res.status(201).json(task);
});

app.put("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const task = await prisma.task.update({ where: { id }, data: req.body });
    res.json(task);
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.task.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
