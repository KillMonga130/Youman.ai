-- CreateEnum
CREATE TYPE "TrainingJobStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- CreateTable
CREATE TABLE "training_data_points" (
    "id" TEXT NOT NULL,
    "transformation_id" TEXT,
    "user_id" TEXT,
    "project_id" TEXT,
    "original_text" TEXT NOT NULL,
    "humanized_text" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "input_detection_score" DOUBLE PRECISION,
    "output_detection_score" DOUBLE PRECISION,
    "detection_score_improvement" DOUBLE PRECISION,
    "quality_score" DOUBLE PRECISION,
    "user_feedback" JSONB,
    "metadata" JSONB NOT NULL,
    "used_in_training" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model_id" TEXT NOT NULL,
    "base_version_id" TEXT,
    "config" JSONB NOT NULL,
    "data_query" JSONB,
    "data_point_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TrainingJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_epoch" INTEGER,
    "total_epochs" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "resulting_version_id" TEXT,
    "training_metrics" JSONB,
    "validation_metrics" JSONB,
    "executor_type" TEXT NOT NULL DEFAULT 'local',
    "executor_config" JSONB,
    "resource_requirements" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_artifacts" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "version_id" TEXT,
    "training_job_id" TEXT,
    "artifact_type" TEXT NOT NULL,
    "artifact_path" TEXT NOT NULL,
    "artifact_size" BIGINT,
    "artifact_hash" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 's3',
    "storage_location" JSONB NOT NULL,
    "metadata" JSONB,
    "lineage" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_registry" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model_type" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "architecture" JSONB,
    "parent_model_id" TEXT,
    "base_model_id" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "latest_version" TEXT,
    "total_versions" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_registry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_data_points_user_id_idx" ON "training_data_points"("user_id");

-- CreateIndex
CREATE INDEX "training_data_points_transformation_id_idx" ON "training_data_points"("transformation_id");

-- CreateIndex
CREATE INDEX "training_data_points_strategy_idx" ON "training_data_points"("strategy");

-- CreateIndex
CREATE INDEX "training_data_points_quality_score_idx" ON "training_data_points"("quality_score");

-- CreateIndex
CREATE INDEX "training_data_points_detection_score_improvement_idx" ON "training_data_points"("detection_score_improvement");

-- CreateIndex
CREATE INDEX "training_data_points_created_at_idx" ON "training_data_points"("created_at");

-- CreateIndex
CREATE INDEX "training_jobs_model_id_idx" ON "training_jobs"("model_id");

-- CreateIndex
CREATE INDEX "training_jobs_status_idx" ON "training_jobs"("status");

-- CreateIndex
CREATE INDEX "training_jobs_created_at_idx" ON "training_jobs"("created_at");

-- CreateIndex
CREATE INDEX "training_jobs_created_by_idx" ON "training_jobs"("created_by");

-- CreateIndex
CREATE INDEX "model_artifacts_model_id_idx" ON "model_artifacts"("model_id");

-- CreateIndex
CREATE INDEX "model_artifacts_version_id_idx" ON "model_artifacts"("version_id");

-- CreateIndex
CREATE INDEX "model_artifacts_training_job_id_idx" ON "model_artifacts"("training_job_id");

-- CreateIndex
CREATE INDEX "model_artifacts_artifact_type_idx" ON "model_artifacts"("artifact_type");

-- CreateIndex
CREATE UNIQUE INDEX "model_registry_model_id_key" ON "model_registry"("model_id");

-- CreateIndex
CREATE INDEX "model_registry_model_type_idx" ON "model_registry"("model_type");

-- CreateIndex
CREATE INDEX "model_registry_framework_idx" ON "model_registry"("framework");

-- CreateIndex
CREATE INDEX "model_registry_is_active_idx" ON "model_registry"("is_active");

-- CreateIndex
CREATE INDEX "model_registry_created_at_idx" ON "model_registry"("created_at");
