import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { execSync } from "child_process";
import { Client } from "pg";
import * as fs from "fs";

const getIntrospection = (
  dbUrl: string,
  dbType: "postgres" | "mysql" | "sqlite",
) => {
  if (fs.existsSync("./migrations")) {
    fs.rmdirSync("./migrations", { recursive: true });
  }

  switch (dbType) {
    case "postgres":
      execSync(
        `pnpm drizzle-kit introspect:pg --driver=pg --out=migrations/ --connectionString=${dbUrl}`,
      ).toString();
      break;
    case "mysql":
      execSync(
        `pnpm drizzle-kit introspect:mysql --driver=mysql2 --out=migrations/ --connectionString=${dbUrl}`,
      ).toString();
      break;
  }

  const filename = fs
    .readdirSync("./migrations")
    .find((file) => file.endsWith(".sql"));

  const ddl = fs
    .readFileSync(`./migrations/${filename}`)
    .toString()
    .replace("/*", "")
    .replace("*/", "")
    .split("\n")
    .filter((line) => !line.startsWith("--"))
    .join("\n");

  return ddl;
};

/**
 * pl albo en
 */
const translate =
  "https://3d26-2a09-bac1-5bc0-8-00-49-152.ngrok-free.app/translate";

const llama13b =
  "https://3d26-2a09-bac1-5bc0-8-00-49-152.ngrok-free.app/process_message";

const codeLLama =
  "https://3d26-2a09-bac1-5bc0-8-00-49-152.ngrok-free.app/fix_sql";

// Create the fetch options
const requestOptions = (requestBody2: {
  user_input: string;
  conversation: string;
  schema: string;
  context: number[] | null;
}) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody2),
});

// Make the API request

export const exampleRouter = createTRPCRouter({
  introspectDb: publicProcedure
    .input(
      z.object({
        dbUrl: z.string(),
        dbType: z.enum(["postgres", "mysql", "sqlite"]),
      }),
    )
    .mutation(({ input }) => {
      const { dbUrl, dbType } = input;

      const ddl = getIntrospection(dbUrl, dbType);

      return {
        ddl,
      };
    }),
  executeQuery: publicProcedure
    .input(
      z.object({
        dbUrl: z.string(),
        query: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.dbUrl.startsWith("postgres")) {
        const client = new Client({
          connectionString: input.dbUrl,
        });
        await client.connect();

        const result = await client.query({
          text: input.query,
          rowMode: "array",
        });

        await client.end();

        return result;
      }
    }),

  getResponse: publicProcedure
    .input(
      z.object({
        user_input: z.string(),
        conversation: z.string(),
        schema: z.string(),
        context: z.array(z.number()).nullable().default(null),
      }),
    )
    .mutation(async ({ input }) => {
      const data = await fetch(llama13b, requestOptions(input));

      const response = (await data.json()) as {
        message: string;
        sql_code?: string;
      };

      return {
        message: response.message,
        sql_code: response.sql_code?.replaceAll("\n", " ").replace(/\s+/g, " "),
      };
    }),
});
