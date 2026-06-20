import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { existsSync } from "fs";

const SQLITE_PATH = resolve(__dirname, "../prisma/dev.db");

async function main() {
  if (!existsSync(SQLITE_PATH)) {
    console.error(`SQLite database non trovato: ${SQLITE_PATH}`);
    process.exit(1);
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const prisma = new PrismaClient();

  try {
    const users = sqlite.prepare("SELECT * FROM users").all() as Array<{
      id: string;
      email: string;
      passwordHash: string;
      name: string | null;
      image: string | null;
      createdAt: string;
      updatedAt: string;
    }>;

    console.log(`Migrazione ${users.length} utenti...`);
    for (const u of users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          image: u.image,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    const sessions = sqlite.prepare("SELECT * FROM sessions").all() as Array<{
      id: string;
      userId: string;
      expiresAt: string;
      createdAt: string;
    }>;

    console.log(`Migrazione ${sessions.length} sessioni...`);
    for (const s of sessions) {
      await prisma.session.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          userId: s.userId,
          expiresAt: new Date(s.expiresAt),
          createdAt: new Date(s.createdAt),
        },
      });
    }

    const jobs = sqlite.prepare("SELECT * FROM distill_jobs").all() as Array<{
      id: string;
      userId: string;
      topic: string;
      tone: string;
      status: string;
      result: string | null;
      createdAt: string;
      updatedAt: string;
    }>;

    console.log(`Migrazione ${jobs.length} distill jobs...`);
    for (const j of jobs) {
      await prisma.distillJob.upsert({
        where: { id: j.id },
        update: {},
        create: {
          id: j.id,
          userId: j.userId,
          topic: j.topic,
          tone: j.tone,
          status: j.status,
          result: j.result ? JSON.parse(j.result) : null,
          createdAt: new Date(j.createdAt),
          updatedAt: new Date(j.updatedAt),
        },
      });
    }

    const sources = sqlite
      .prepare("SELECT * FROM distill_sources")
      .all() as Array<{
      id: string;
      jobId: string;
      url: string;
      title: string;
      excerpt: string;
      position: string;
    }>;

    console.log(`Migrazione ${sources.length} distill sources...`);
    for (const s of sources) {
      await prisma.distillSource.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          jobId: s.jobId,
          url: s.url,
          title: s.title,
          excerpt: s.excerpt,
          position: s.position,
        },
      });
    }

    const settings = sqlite
      .prepare("SELECT * FROM app_settings")
      .all() as Array<{
      id: string;
      claudeMode: string;
      updatedAt: string;
    }>;

    console.log(`Migrazione ${settings.length} app settings...`);
    for (const s of settings) {
      await prisma.appSettings.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          claudeMode: s.claudeMode,
          updatedAt: new Date(s.updatedAt),
        },
      });
    }

    console.log("Migrazione completata con successo!");
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Errore durante la migrazione:", err);
  process.exit(1);
});
