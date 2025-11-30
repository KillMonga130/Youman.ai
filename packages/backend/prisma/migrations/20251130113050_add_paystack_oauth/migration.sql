/*
  Warnings:

  - You are about to drop the column `stripe_customer_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paystack_customer_id]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paystack_subscription_id]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "subscriptions_stripe_customer_id_idx";

-- DropIndex
DROP INDEX "subscriptions_stripe_customer_id_key";

-- DropIndex
DROP INDEX "subscriptions_stripe_subscription_id_key";

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_subscription_id",
ADD COLUMN     "paystack_authorization_code" TEXT,
ADD COLUMN     "paystack_customer_id" TEXT,
ADD COLUMN     "paystack_subscription_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "oauth_access_token" TEXT,
ADD COLUMN     "oauth_provider" TEXT,
ADD COLUMN     "oauth_provider_id" TEXT,
ADD COLUMN     "oauth_refresh_token" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paystack_customer_id_key" ON "subscriptions"("paystack_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paystack_subscription_id_key" ON "subscriptions"("paystack_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_paystack_customer_id_idx" ON "subscriptions"("paystack_customer_id");
