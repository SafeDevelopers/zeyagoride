ALTER TABLE "User"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
