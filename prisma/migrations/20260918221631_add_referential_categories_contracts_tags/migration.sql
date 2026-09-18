-- CreateTable
CREATE TABLE "mission_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Bootstrap seed (AD-033): the three mission categories every V1 instance
-- ships with, since `prisma/seed.ts` never runs against a production
-- deployment (only `prisma migrate deploy` does, at container start) and a
-- mission category is a first-class, user-editable row - not a computed
-- default (contrast AD-031).
INSERT INTO "mission_categories" ("label", "active", "updated_at") VALUES ('Formation école', true, CURRENT_TIMESTAMP);
INSERT INTO "mission_categories" ("label", "active", "updated_at") VALUES ('Formation pro', true, CURRENT_TIMESTAMP);
INSERT INTO "mission_categories" ("label", "active", "updated_at") VALUES ('Conseil', true, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "portage_contracts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "charge_rate_basis_points" INTEGER NOT NULL,
    "valid_from" DATETIME NOT NULL,
    "valid_to" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parent_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tags_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tags" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_path_key" ON "tags"("path");

-- CreateIndex
CREATE INDEX "tags_parent_id_idx" ON "tags"("parent_id");
