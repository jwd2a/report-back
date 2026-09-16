import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
export const documents = sqliteTable("documents", {
 id: text("id").primaryKey(), owner: text("owner").notNull(), title: text("title").notNull(), created: text("created").notNull(),
}, t => [index("documents_owner").on(t.owner)]);
export const contributions = sqliteTable("contributions", {
 documentId: text("document_id").notNull().references(()=>documents.id), scope: text("scope").notNull(), label: text("label").notNull(), position: integer("position").notNull(), markdown: text("markdown").notNull().default(""), revision: integer("revision").notNull().default(0), updated: text("updated"),
},t=>[primaryKey({columns:[t.documentId,t.scope]})]);
export const keys = sqliteTable("keys", {
 id:text("id").primaryKey(), documentId:text("document_id").notNull().references(()=>documents.id), scope:text("scope"), label:text("label").notNull(), hash:text("hash").notNull().unique(), created:text("created").notNull(), revoked:integer("revoked").notNull().default(0),
},t=>[index("keys_document").on(t.documentId)]);
export const revisions = sqliteTable("revisions", {
 documentId:text("document_id").notNull(), scope:text("scope").notNull(), revision:integer("revision").notNull(), markdown:text("markdown").notNull(), updated:text("updated").notNull(), actor:text("actor").notNull(),
},t=>[primaryKey({columns:[t.documentId,t.scope,t.revision]})]);
