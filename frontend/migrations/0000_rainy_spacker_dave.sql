-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE IF NOT EXISTS "jpk_naglowek" (
	"naglowek_id" numeric,
	"czas_wyslania" numeric,
	"czas_utworzenia" numeric,
	"data_od" numeric,
	"data_do" numeric,
	"rokmc" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jpk_podmiot" (
	"podmiot_id" numeric,
	"naglowek_id" numeric,
	"nip" text,
	"imie" text,
	"nazwisko" text,
	"data_urodzenia" numeric,
	"telefon" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vat_sprzedaz" (
	"sprzedaz_id" numeric,
	"naglowek_id" numeric,
	"nr_kontrahenta" text,
	"dowod_sprzedazy" text,
	"data_wystawienia" numeric,
	"data_sprzedazy" numeric,
	"p_6" numeric,
	"p_8" numeric,
	"p_9" numeric,
	"p_11" numeric,
	"p_13" numeric,
	"p_15" numeric,
	"p_16" numeric,
	"p_19" numeric,
	"p_96" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vat_zakup" (
	"zakup_id" numeric,
	"naglowek_id" numeric,
	"nr_dostawcy" text,
	"dowod_zakupu" text,
	"data_zakupu" numeric,
	"data_wplywu" numeric,
	"p_61" numeric,
	"p_77" numeric,
	"p_78" numeric
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_16390_sqlite_autoindex_jpk_podmiot_1" ON "jpk_podmiot" ("podmiot_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_16396_sqlite_autoindex_vat_sprzedaz_1" ON "vat_sprzedaz" ("sprzedaz_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_16402_sqlite_autoindex_vat_zakup_1" ON "vat_zakup" ("zakup_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jpk_podmiot" ADD CONSTRAINT "jpk_podmiot_naglowek_id_fkey" FOREIGN KEY ("naglowek_id") REFERENCES "jpk_naglowek"("naglowek_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vat_sprzedaz" ADD CONSTRAINT "vat_sprzedaz_naglowek_id_fkey" FOREIGN KEY ("naglowek_id") REFERENCES "jpk_naglowek"("naglowek_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vat_zakup" ADD CONSTRAINT "vat_zakup_naglowek_id_fkey" FOREIGN KEY ("naglowek_id") REFERENCES "jpk_naglowek"("naglowek_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

*/