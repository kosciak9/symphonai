import { pgTable, numeric, uniqueIndex, foreignKey, text } from "drizzle-orm/pg-core"

import { sql } from "drizzle-orm"


export const jpkNaglowek = pgTable("jpk_naglowek", {
	naglowekId: numeric("naglowek_id"),
	czasWyslania: numeric("czas_wyslania"),
	czasUtworzenia: numeric("czas_utworzenia"),
	dataOd: numeric("data_od"),
	dataDo: numeric("data_do"),
	rokmc: numeric("rokmc"),
});

export const jpkPodmiot = pgTable("jpk_podmiot", {
	podmiotId: numeric("podmiot_id"),
	naglowekId: numeric("naglowek_id").references(() => jpkNaglowek.naglowekId),
	nip: text("nip"),
	imie: text("imie"),
	nazwisko: text("nazwisko"),
	dataUrodzenia: numeric("data_urodzenia"),
	telefon: numeric("telefon"),
},
(table) => {
	return {
		idx16390SqliteAutoindexJpkPodmiot1: uniqueIndex("idx_16390_sqlite_autoindex_jpk_podmiot_1").on(table.podmiotId),
	}
});

export const vatSprzedaz = pgTable("vat_sprzedaz", {
	sprzedazId: numeric("sprzedaz_id"),
	naglowekId: numeric("naglowek_id").references(() => jpkNaglowek.naglowekId),
	nrKontrahenta: text("nr_kontrahenta"),
	dowodSprzedazy: text("dowod_sprzedazy"),
	dataWystawienia: numeric("data_wystawienia"),
	dataSprzedazy: numeric("data_sprzedazy"),
	p6: numeric("p_6"),
	p8: numeric("p_8"),
	p9: numeric("p_9"),
	p11: numeric("p_11"),
	p13: numeric("p_13"),
	p15: numeric("p_15"),
	p16: numeric("p_16"),
	p19: numeric("p_19"),
	p96: numeric("p_96"),
},
(table) => {
	return {
		idx16396SqliteAutoindexVatSprzedaz1: uniqueIndex("idx_16396_sqlite_autoindex_vat_sprzedaz_1").on(table.sprzedazId),
	}
});

export const vatZakup = pgTable("vat_zakup", {
	zakupId: numeric("zakup_id"),
	naglowekId: numeric("naglowek_id").references(() => jpkNaglowek.naglowekId),
	nrDostawcy: text("nr_dostawcy"),
	dowodZakupu: text("dowod_zakupu"),
	dataZakupu: numeric("data_zakupu"),
	dataWplywu: numeric("data_wplywu"),
	p61: numeric("p_61"),
	p77: numeric("p_77"),
	p78: numeric("p_78"),
},
(table) => {
	return {
		idx16402SqliteAutoindexVatZakup1: uniqueIndex("idx_16402_sqlite_autoindex_vat_zakup_1").on(table.zakupId),
	}
});