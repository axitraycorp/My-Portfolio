-- CreateTable
CREATE TABLE "lab_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "max_builds" INTEGER NOT NULL DEFAULT 3,
    "advisor_credits" INTEGER NOT NULL DEFAULT 5,
    "advisor_used" INTEGER NOT NULL DEFAULT 0,
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_builds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_builds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_users_email_key" ON "lab_users"("email");

-- CreateIndex
CREATE INDEX "lab_builds_user_id_idx" ON "lab_builds"("user_id");

-- AddForeignKey
ALTER TABLE "lab_builds" ADD CONSTRAINT "lab_builds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lab_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
