CREATE TYPE "public"."ai_status" AS ENUM('pending', 'success', 'failed', 'invalid_response');--> statement-breakpoint
CREATE TYPE "public"."ai_task_type" AS ENUM('word_details', 'image_generation', 'quiz_generation', 'question_generation', 'weekly_report', 'recommendations', 'sentence_evaluation', 'text_extraction');--> statement-breakpoint
CREATE TYPE "public"."cefr_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2');--> statement-breakpoint
CREATE TYPE "public"."daily_status" AS ENUM('NOT_STARTED', 'PARTIAL', 'COMPLETE', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."learning_session_type" AS ENUM('start_learning', 'flashcards', 'quick_review', 'quiz', 'manual');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('daily_reminder', 'review_due', 'streak_risk', 'weekly_report', 'weekly_quiz', 'achievement', 'system');--> statement-breakpoint
CREATE TYPE "public"."part_of_speech" AS ENUM('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'determiner', 'phrase', 'other');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'meaning_identification', 'synonym', 'antonym', 'fill_blank', 'sentence_selection', 'word_matching', 'reverse_recall', 'typing', 'contextual_usage');--> statement-breakpoint
CREATE TYPE "public"."quiz_status" AS ENUM('pending', 'in_progress', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."quiz_type" AS ENUM('weekly', 'adaptive', 'quick', 'custom');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."review_mode" AS ENUM('flashcard_front_back', 'flashcard_back_front', 'flashcard_meaning_to_word', 'flashcard_word_to_meaning', 'flashcard_fill_blank', 'flashcard_synonym_challenge', 'flashcard_antonym_challenge', 'quick_review');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."word_source" AS ENUM('ai', 'manual', 'extracted');--> statement-breakpoint
CREATE TYPE "public"."word_status" AS ENUM('NEW', 'LEARNING', 'REVIEW', 'MASTERED');--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_reminder_enabled" boolean DEFAULT true NOT NULL,
	"review_due_reminder_enabled" boolean DEFAULT true NOT NULL,
	"weekly_quiz_reminder_enabled" boolean DEFAULT true NOT NULL,
	"weekly_report_enabled" boolean DEFAULT true NOT NULL,
	"streak_risk_reminder_enabled" boolean DEFAULT true NOT NULL,
	"second_reminder_enabled" boolean DEFAULT false NOT NULL,
	"second_reminder_time" time,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cefr_level" "cefr_level" DEFAULT 'B1' NOT NULL,
	"learning_goals" text[] DEFAULT '{}' NOT NULL,
	"daily_word_target" integer DEFAULT 2 NOT NULL,
	"reminder_time" time,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_categories" (
	"word_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_categories_word_id_category_id_user_id_pk" PRIMARY KEY("word_id","category_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"text_normalized" text NOT NULL,
	"part_of_speech" "part_of_speech",
	"pronunciation" text,
	"ipa" text,
	"cefr_level" "cefr_level",
	"definition" text,
	"simple_explanation" text,
	"practical_explanation" text,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synonyms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"antonyms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collocations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"word_family" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"usage_notes" text,
	"common_mistakes" text,
	"image_url" text,
	"image_generated_at" timestamp with time zone,
	"ai_generated_at" timestamp with time zone,
	"ai_generation_id" uuid,
	"source_type" "word_source" DEFAULT 'ai' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english',
          coalesce("text", '') || ' ' ||
          coalesce("definition", '') || ' ' ||
          coalesce("usage_notes", '')
        )) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"status" "word_status" DEFAULT 'NEW' NOT NULL,
	"times_seen" integer DEFAULT 0 NOT NULL,
	"times_correct" integer DEFAULT 0 NOT NULL,
	"times_wrong" integer DEFAULT 0 NOT NULL,
	"consecutive_correct" integer DEFAULT 0 NOT NULL,
	"consecutive_wrong" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"interval_days" real DEFAULT 0 NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"repetition_number" integer DEFAULT 0 NOT NULL,
	"difficulty" real,
	"confidence" real,
	"mastery_score" real DEFAULT 0 NOT NULL,
	"is_weak" boolean DEFAULT false NOT NULL,
	"weak_since" timestamp with time zone,
	"marked_mastered_at" timestamp with time zone,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"notes" text,
	"first_learned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_words" (
	"collection_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_words_collection_id_word_id_pk" PRIMARY KEY("collection_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"words_target" integer NOT NULL,
	"words_added" integer DEFAULT 0 NOT NULL,
	"reviews_completed" integer DEFAULT 0 NOT NULL,
	"quiz_completed" boolean DEFAULT false NOT NULL,
	"status" "daily_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_word_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_entry_id" uuid NOT NULL,
	"user_word_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learning_session_id" uuid,
	"mode" "review_mode" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cards_total" integer DEFAULT 0 NOT NULL,
	"cards_completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_type" "learning_session_type" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"words_planned" integer,
	"words_completed" integer DEFAULT 0 NOT NULL,
	"estimated_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"user_answer" text,
	"is_correct" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_word_id" uuid NOT NULL,
	"flashcard_session_id" uuid,
	"mode" "review_mode" NOT NULL,
	"rating" "rating",
	"was_correct" boolean,
	"response_time_ms" integer,
	"interval_before_days" real,
	"interval_after_days" real,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_attempt_id" uuid NOT NULL,
	"quiz_question_id" uuid NOT NULL,
	"user_answer" text,
	"is_correct" boolean NOT NULL,
	"response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_word_id" uuid,
	"word_id" uuid,
	"question_type" "question_type" NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb,
	"correct_answer" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"difficulty_at_creation" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "quiz_type" NOT NULL,
	"title" text,
	"week_start_date" date,
	"status" "quiz_status" DEFAULT 'pending' NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"score" real,
	"ai_generation_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"freezes_available" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"task_type" "ai_task_type" NOT NULL,
	"provider" text DEFAULT 'anthropic' NOT NULL,
	"model" text NOT NULL,
	"input_hash" text NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"status" "ai_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"estimated_cost_usd" real,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_categories" ADD CONSTRAINT "word_categories_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_categories" ADD CONSTRAINT "word_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_categories" ADD CONSTRAINT "word_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_ai_generation_id_ai_generations_id_fk" FOREIGN KEY ("ai_generation_id") REFERENCES "public"."ai_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_words" ADD CONSTRAINT "collection_words_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_words" ADD CONSTRAINT "collection_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_word_entries" ADD CONSTRAINT "daily_word_entries_daily_entry_id_daily_entries_id_fk" FOREIGN KEY ("daily_entry_id") REFERENCES "public"."daily_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_word_entries" ADD CONSTRAINT "daily_word_entries_user_word_id_user_words_id_fk" FOREIGN KEY ("user_word_id") REFERENCES "public"."user_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_sessions" ADD CONSTRAINT "flashcard_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_sessions" ADD CONSTRAINT "flashcard_sessions_learning_session_id_learning_sessions_id_fk" FOREIGN KEY ("learning_session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_word_id_user_words_id_fk" FOREIGN KEY ("user_word_id") REFERENCES "public"."user_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_flashcard_session_id_flashcard_sessions_id_fk" FOREIGN KEY ("flashcard_session_id") REFERENCES "public"."flashcard_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_quiz_question_id_quiz_questions_id_fk" FOREIGN KEY ("quiz_question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_user_word_id_user_words_id_fk" FOREIGN KEY ("user_word_id") REFERENCES "public"."user_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_ai_generation_id_ai_generations_id_fk" FOREIGN KEY ("ai_generation_id") REFERENCES "public"."ai_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users" USING btree ("email_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_id_unique" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_unique" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_default_slug_unique" ON "categories" USING btree ("slug") WHERE "categories"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_slug_unique" ON "categories" USING btree ("slug","user_id") WHERE "categories"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "word_categories_category_id_idx" ON "word_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "word_categories_user_word_idx" ON "word_categories" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE UNIQUE INDEX "words_text_normalized_unique" ON "words" USING btree ("text_normalized");--> statement-breakpoint
CREATE INDEX "words_cefr_level_idx" ON "words" USING btree ("cefr_level");--> statement-breakpoint
CREATE INDEX "words_search_vector_idx" ON "words" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "user_words_user_word_unique" ON "user_words" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE INDEX "user_words_due_idx" ON "user_words" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "user_words_status_idx" ON "user_words" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_words_weak_idx" ON "user_words" USING btree ("user_id","is_weak");--> statement-breakpoint
CREATE INDEX "user_words_favorite_idx" ON "user_words" USING btree ("user_id","is_favorite");--> statement-breakpoint
CREATE INDEX "user_words_word_id_idx" ON "user_words" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "collection_words_word_id_idx" ON "collection_words" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "collections_user_id_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_name_unique" ON "collections" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_entries_user_date_unique" ON "daily_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_entries_user_date_idx" ON "daily_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_word_entries_daily_user_word_unique" ON "daily_word_entries" USING btree ("daily_entry_id","user_word_id");--> statement-breakpoint
CREATE INDEX "daily_word_entries_daily_entry_idx" ON "daily_word_entries" USING btree ("daily_entry_id");--> statement-breakpoint
CREATE INDEX "flashcard_sessions_user_id_idx" ON "flashcard_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "learning_sessions_user_id_idx" ON "learning_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_attempts_review_id_idx" ON "review_attempts" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_user_word_idx" ON "reviews" USING btree ("user_word_id");--> statement-breakpoint
CREATE INDEX "reviews_user_reviewed_at_idx" ON "reviews" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "quiz_answers_attempt_id_idx" ON "quiz_answers" USING btree ("quiz_attempt_id");--> statement-breakpoint
CREATE INDEX "quiz_answers_question_id_idx" ON "quiz_answers" USING btree ("quiz_question_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_id_idx" ON "quiz_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_user_word_idx" ON "quiz_questions" USING btree ("user_word_id");--> statement-breakpoint
CREATE INDEX "quizzes_user_id_idx" ON "quizzes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_user_week_unique" ON "quizzes" USING btree ("user_id","week_start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_streaks_user_id_unique" ON "user_streaks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "ai_generations_input_hash_idx" ON "ai_generations" USING btree ("input_hash");--> statement-breakpoint
CREATE INDEX "ai_generations_task_type_idx" ON "ai_generations" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_generations_user_id_idx" ON "ai_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_generations_status_idx" ON "ai_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_generations_created_at_idx" ON "ai_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_generations_user_created_idx" ON "ai_generations" USING btree ("user_id","created_at");